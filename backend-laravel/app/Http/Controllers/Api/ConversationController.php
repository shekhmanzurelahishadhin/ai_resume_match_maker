<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\JobApplication;
use App\Models\JobMatch;
use App\Models\JobPost;
use App\Models\Message;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Recruiter ↔ candidate messaging.
 *
 * Only a recruiter can open a thread, and only with a seeker who matched or
 * applied to one of that recruiter's jobs. Either side can reply afterwards.
 */
class ConversationController extends Controller
{
    use ApiResponse;

    public function __construct(private NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $conversations = Conversation::query()
            ->where(fn ($q) => $q->where('recruiter_id', $user->id)->orWhere('seeker_id', $user->id))
            ->with(['recruiter:id,name', 'seeker:id,name', 'jobPost:id,title,company', 'latestMessage'])
            ->withCount(['messages as unread_count' => fn ($q) => $q
                ->whereNull('read_at')
                ->where('sender_id', '!=', $user->id)])
            ->orderByDesc('last_message_at')
            ->limit(100)
            ->get();

        return $this->ok([
            'items' => $conversations->map(fn (Conversation $c) => $this->summary($c, $user))->all(),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        $count = Message::whereNull('read_at')
            ->where('sender_id', '!=', $user->id)
            ->whereHas('conversation', fn ($q) => $q
                ->where('recruiter_id', $user->id)
                ->orWhere('seeker_id', $user->id))
            ->count();

        return $this->ok(['count' => $count]);
    }

    /** Recruiter starts (or continues) a thread with a candidate. */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'seekerId' => ['required', 'uuid'],
            'jobId' => ['required', 'uuid'],
            'body' => ['required', 'string', 'min:1', 'max:5000'],
        ]);

        $job = JobPost::find($data['jobId']);
        if (! $job || $job->recruiter_id !== $user->id) {
            return $this->forbidden('You can only contact candidates for your own jobs.');
        }
        $seeker = User::find($data['seekerId']);
        $related = $seeker && $seeker->isSeeker() && (
            JobMatch::where('job_post_id', $job->id)
                ->whereHas('resume', fn ($q) => $q->where('user_id', $seeker->id))->exists()
            || JobApplication::where('job_post_id', $job->id)->where('seeker_id', $seeker->id)->exists()
        );
        if (! $related) {
            return $this->forbidden('This candidate has not matched or applied to this job.');
        }

        $conversation = Conversation::firstOrCreate([
            'recruiter_id' => $user->id,
            'seeker_id' => $seeker->id,
            'job_post_id' => $job->id,
        ]);
        $message = $this->post($conversation, $user, $data['body']);

        return $this->created([
            'conversation' => $this->summary($conversation->fresh(['recruiter', 'seeker', 'jobPost', 'latestMessage']), $user),
            'message' => $this->messageData($message, $user),
        ]);
    }

    /** A thread with its messages; opening it marks incoming messages read. */
    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        if (! $conversation->hasParticipant($user)) {
            return $this->notFound();
        }

        $conversation->messages()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id)
            ->update(['read_at' => now()]);

        $conversation->load(['recruiter:id,name', 'seeker:id,name', 'jobPost:id,title,company', 'latestMessage']);
        $messages = $conversation->messages()->get();

        return $this->ok([
            'conversation' => $this->summary($conversation, $user),
            'messages' => $messages->map(fn (Message $m) => $this->messageData($m, $user))->all(),
        ]);
    }

    public function reply(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        if (! $conversation->hasParticipant($user)) {
            return $this->notFound();
        }
        $data = $request->validate(['body' => ['required', 'string', 'min:1', 'max:5000']]);

        $message = $this->post($conversation, $user, $data['body']);

        return $this->created(['message' => $this->messageData($message, $user)]);
    }

    private function post(Conversation $conversation, User $sender, string $body): Message
    {
        $message = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'body' => trim($body),
        ]);
        $conversation->forceFill(['last_message_at' => $message->created_at])->save();

        $this->notifications->notifyNewMessage($conversation->loadMissing('jobPost'), $sender, $message);

        return $message;
    }

    private function summary(Conversation $c, User $viewer): array
    {
        $isRecruiter = $viewer->id === $c->recruiter_id;
        $other = $isRecruiter ? $c->seeker : $c->recruiter;
        $last = $c->latestMessage;

        return [
            'id' => $c->id,
            'otherParty' => [
                'id' => $other?->id,
                'name' => $other?->name,
                'role' => $isRecruiter ? 'seeker' : 'recruiter',
            ],
            'job' => $c->jobPost ? [
                'id' => $c->jobPost->id,
                'title' => $c->jobPost->title,
                'company' => $c->jobPost->company,
            ] : null,
            'lastMessage' => $last ? [
                'body' => mb_strimwidth($last->body, 0, 140, '…'),
                'mine' => $last->sender_id === $viewer->id,
                'createdAt' => $last->created_at?->toIso8601String(),
            ] : null,
            'unreadCount' => (int) ($c->unread_count ?? 0),
            'lastMessageAt' => $c->last_message_at?->toIso8601String(),
        ];
    }

    private function messageData(Message $m, User $viewer): array
    {
        return [
            'id' => $m->id,
            'body' => $m->body,
            'mine' => $m->sender_id === $viewer->id,
            'readAt' => $m->read_at?->toIso8601String(),
            'createdAt' => $m->created_at?->toIso8601String(),
        ];
    }
}
