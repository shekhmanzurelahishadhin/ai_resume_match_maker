<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Notification\RegisterDeviceRequest;
use App\Http\Requests\Notification\UpdatePreferencesRequest;
use App\Http\Resources\NotificationPreferenceResource;
use App\Http\Resources\NotificationResource;
use App\Jobs\SendDailyDigest;
use App\Models\DeviceToken;
use App\Models\Notification;
use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        ['page' => $page, 'pageSize' => $pageSize] = $this->parsePagination($request, 15);
        $unreadOnly = $request->boolean('unreadOnly');

        $query = Notification::where('user_id', $user->id)
            ->when($unreadOnly, fn ($q) => $q->unread())
            ->orderByDesc('created_at');
        $total = $query->count();
        $items = $query->skip(($page - 1) * $pageSize)->take($pageSize)->get();

        return $this->ok([
            'items' => NotificationResource::collection($items)->resolve(),
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
            'totalPages' => max(1, (int) ceil($total / $pageSize)),
        ]);
    }

    public function registerDevice(RegisterDeviceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        $token = DeviceToken::updateOrCreate(
            ['device_token' => $data['deviceToken']],
            [
                'user_id' => $user->id,
                'device_type' => $data['deviceType'],
                'browser_info' => $data['browserInfo'] ?? null,
                'is_active' => true,
                'last_used_at' => now(),
            ],
        );

        return $this->created(['deviceToken' => $token]);
    }

    public function deleteDevice(Request $request, string $token): JsonResponse
    {
        $user = $request->user();
        $row = DeviceToken::where('device_token', $token)->where('user_id', $user->id)->first();
        if (! $row) {
            return $this->notFound('Device token not found');
        }
        $row->is_active = false;
        $row->save();
        return $this->ok(['deactivated' => true]);
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            return $this->notFound('Notification not found');
        }
        $notification->markRead();
        return $this->ok(['notification' => NotificationResource::make($notification->fresh())]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $count = Notification::where('user_id', $user->id)->unread()->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
        return $this->ok(['updated' => $count]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = Notification::where('user_id', $request->user()->id)->unread()->count();
        return $this->ok(['count' => $count]);
    }

    public function preferences(Request $request): JsonResponse
    {
        $prefs = NotificationPreference::getOrCreateFor($request->user());
        return $this->ok(['preferences' => NotificationPreferenceResource::make($prefs)]);
    }

    public function updatePreferences(UpdatePreferencesRequest $request): JsonResponse
    {
        $data = $request->validated();
        $prefs = NotificationPreference::getOrCreateFor($request->user());

        foreach (['emailNotifications', 'pushNotifications', 'jobMatches', 'resumeAnalysis', 'newJobs', 'dailyDigest'] as $field) {
            if (array_key_exists($field, $data)) {
                $column = strtolower(preg_replace('/([A-Z])/', '_$1', $field));
                $prefs->{$column} = (bool) $data[$field];
            }
        }
        $prefs->save();

        return $this->ok(['preferences' => NotificationPreferenceResource::make($prefs->fresh())]);
    }

    public function digestRun(Request $request): JsonResponse
    {
        SendDailyDigest::dispatch();
        return $this->ok(['status' => 'dispatched']);
    }

    /**
     * Public endpoint — surfaces the browser-side Firebase config from
     * NEXT_PUBLIC_FIREBASE_* env vars. No secrets.
     */
    public function firebaseConfig(): JsonResponse
    {
        $config = config('firebase.public', []);
        $enabled = filled($config['apiKey'] ?? null) && filled($config['projectId'] ?? null);
        return $this->ok([
            'config' => $config,
            'enabled' => $enabled,
        ]);
    }
}
