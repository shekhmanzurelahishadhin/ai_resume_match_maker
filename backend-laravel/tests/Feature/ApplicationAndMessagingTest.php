<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\JobMatch;
use App\Models\JobPost;
use App\Models\Notification;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ApplicationAndMessagingTest extends TestCase
{
    use RefreshDatabase;

    private User $seeker;

    private User $recruiter;

    private Resume $resume;

    private JobPost $job;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->seeker = User::factory()->seeker()->create(['name' => 'Sam Seeker']);
        $this->recruiter = User::factory()->recruiter()->create();
        $this->resume = Resume::factory()->for($this->seeker, 'user')->create([
            'file_path' => 'resumes/sam.pdf',
            'file_name' => 'sam.pdf',
            'mime_type' => 'application/pdf',
        ]);
        Storage::disk('local')->put('resumes/sam.pdf', '%PDF-1.4 fake');
        $this->job = JobPost::factory()->for($this->recruiter, 'recruiter')->create([
            'title' => 'Laravel Developer',
            'company' => 'Acme',
            'location' => 'Dhaka',
            'work_mode' => 'remote',
            'is_active' => true,
        ]);
        JobMatch::create([
            'resume_id' => $this->resume->id,
            'job_post_id' => $this->job->id,
            'recruiter_id' => $this->recruiter->id,
            'match_percentage' => 81,
            'match_source' => 'fallback',
            'matched_skills_json' => ['skills' => ['Laravel']],
            'missing_skills_json' => ['skills' => ['Vue']],
            'analyzed_at' => now(),
        ]);
    }

    public function test_seeker_sees_job_details_with_their_match(): void
    {
        $this->actingAs($this->seeker, 'sanctum')
            ->getJson("/api/jobs/{$this->job->id}")
            ->assertOk()
            ->assertJsonPath('data.job.company', 'Acme')
            ->assertJsonPath('data.job.workMode', 'remote')
            ->assertJsonPath('data.job.myMatch.matchPercentage', 81)
            ->assertJsonPath('data.job.myMatch.missingSkills.0', 'Vue');

        $this->actingAs($this->seeker, 'sanctum')
            ->getJson('/api/jobs?sort=match&q=Laravel')
            ->assertOk()
            ->assertJsonPath('data.items.0.id', $this->job->id)
            ->assertJsonPath('data.items.0.myMatch.matchPercentage', 81);
    }

    public function test_seeker_can_apply_once_and_recruiter_is_notified(): void
    {
        $this->actingAs($this->seeker, 'sanctum')
            ->postJson("/api/jobs/{$this->job->id}/apply", [
                'resumeId' => $this->resume->id,
                'coverLetter' => 'I would love to join.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.application.status', 'applied')
            ->assertJsonPath('data.application.matchPercentage', 81);

        $this->actingAs($this->seeker, 'sanctum')
            ->postJson("/api/jobs/{$this->job->id}/apply", ['resumeId' => $this->resume->id])
            ->assertStatus(409);

        $this->assertTrue(Notification::where('user_id', $this->recruiter->id)->where('type', 'application')->exists());

        $this->actingAs($this->seeker, 'sanctum')
            ->getJson("/api/jobs/{$this->job->id}")
            ->assertJsonPath('data.job.myApplication.status', 'applied');
    }

    public function test_apply_rejects_someone_elses_resume_and_closed_jobs(): void
    {
        $otherResume = Resume::factory()->for(User::factory()->seeker()->create(), 'user')->create();

        $this->actingAs($this->seeker, 'sanctum')
            ->postJson("/api/jobs/{$this->job->id}/apply", ['resumeId' => $otherResume->id])
            ->assertStatus(422);

        $this->actingAs($this->seeker, 'sanctum')
            ->postJson("/api/jobs/{$this->job->id}/apply", [])
            ->assertStatus(422);

        $this->job->update(['is_active' => false]);
        $this->actingAs($this->seeker, 'sanctum')
            ->postJson("/api/jobs/{$this->job->id}/apply", ['resumeId' => $this->resume->id])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'JOB_CLOSED');

        $this->actingAs($this->recruiter, 'sanctum')
            ->postJson("/api/jobs/{$this->job->id}/apply", ['resumeId' => $this->resume->id])
            ->assertStatus(403);
    }

    public function test_recruiter_moves_application_and_downloads_resume(): void
    {
        $app = $this->apply();

        $this->actingAs($this->recruiter, 'sanctum')
            ->getJson("/api/applications?jobId={$this->job->id}")
            ->assertOk()
            ->assertJsonPath('data.items.0.candidate.email', $this->seeker->email);

        $this->actingAs($this->recruiter, 'sanctum')
            ->patchJson("/api/applications/{$app->id}", ['status' => 'shortlisted'])
            ->assertOk()
            ->assertJsonPath('data.application.statusLabel', 'Shortlisted');
        $this->assertTrue(Notification::where('user_id', $this->seeker->id)->where('type', 'application')->exists());

        $res = $this->actingAs($this->recruiter, 'sanctum')
            ->get("/api/applications/{$app->id}/resume")
            ->assertOk();
        $this->assertStringContainsString('sam-seeker-resume.pdf', $res->headers->get('Content-Disposition'));

        // The job's candidate list now flags the applicant.
        $this->actingAs($this->recruiter, 'sanctum')
            ->getJson("/api/jobs/{$this->job->id}/candidates")
            ->assertJsonPath('data.items.0.application.status', 'shortlisted');
    }

    public function test_outsiders_cannot_touch_applications(): void
    {
        $app = $this->apply();
        $otherRecruiter = User::factory()->recruiter()->create();

        $this->actingAs($otherRecruiter, 'sanctum')
            ->getJson("/api/applications/{$app->id}")->assertForbidden();
        $this->actingAs($otherRecruiter, 'sanctum')
            ->get("/api/applications/{$app->id}/resume")->assertForbidden();
        $this->actingAs($otherRecruiter, 'sanctum')
            ->patchJson("/api/applications/{$app->id}", ['status' => 'hired'])->assertForbidden();
        $this->actingAs($otherRecruiter, 'sanctum')
            ->getJson('/api/applications')->assertJsonCount(0, 'data.items');

        // A seeker cannot set their own status, only withdraw.
        $this->actingAs($this->seeker, 'sanctum')
            ->patchJson("/api/applications/{$app->id}", ['status' => 'hired'])->assertForbidden();
        $this->actingAs($this->seeker, 'sanctum')
            ->postJson("/api/applications/{$app->id}/withdraw")
            ->assertOk()->assertJsonPath('data.application.status', 'withdrawn');

        // ...and may re-apply after withdrawing.
        $this->actingAs($this->seeker, 'sanctum')
            ->postJson("/api/jobs/{$this->job->id}/apply", ['resumeId' => $this->resume->id])
            ->assertCreated();
        $this->assertSame(1, JobApplication::count());
    }

    public function test_recruiter_contacts_matched_candidate_and_seeker_replies(): void
    {
        $conversationId = $this->actingAs($this->recruiter, 'sanctum')
            ->postJson('/api/conversations', [
                'seekerId' => $this->seeker->id,
                'jobId' => $this->job->id,
                'body' => 'Hi Sam, are you open to a chat?',
            ])
            ->assertCreated()
            ->json('data.conversation.id');

        $this->assertTrue(Notification::where('user_id', $this->seeker->id)->where('type', 'message')->exists());

        $this->actingAs($this->seeker, 'sanctum')
            ->getJson('/api/conversations/unread-count')->assertJsonPath('data.count', 1);
        $this->actingAs($this->seeker, 'sanctum')
            ->getJson('/api/conversations')
            ->assertJsonPath('data.items.0.unreadCount', 1)
            ->assertJsonPath('data.items.0.job.title', 'Laravel Developer');

        $this->actingAs($this->seeker, 'sanctum')
            ->getJson("/api/conversations/{$conversationId}")
            ->assertOk()
            ->assertJsonPath('data.messages.0.mine', false);
        $this->actingAs($this->seeker, 'sanctum')
            ->getJson('/api/conversations/unread-count')->assertJsonPath('data.count', 0);

        $this->actingAs($this->seeker, 'sanctum')
            ->postJson("/api/conversations/{$conversationId}/messages", ['body' => 'Yes, happy to talk!'])
            ->assertCreated();

        // A second contact reuses the same thread.
        $this->actingAs($this->recruiter, 'sanctum')
            ->postJson('/api/conversations', [
                'seekerId' => $this->seeker->id, 'jobId' => $this->job->id, 'body' => 'Great!',
            ])
            ->assertJsonPath('data.conversation.id', $conversationId);

        $this->actingAs($this->recruiter, 'sanctum')
            ->getJson("/api/conversations/{$conversationId}")
            ->assertJsonCount(3, 'data.messages');
    }

    public function test_contact_is_limited_to_related_candidates_and_participants(): void
    {
        $stranger = User::factory()->seeker()->create();
        $this->actingAs($this->recruiter, 'sanctum')
            ->postJson('/api/conversations', [
                'seekerId' => $stranger->id, 'jobId' => $this->job->id, 'body' => 'Hello',
            ])
            ->assertForbidden();

        $otherRecruiter = User::factory()->recruiter()->create();
        $this->actingAs($otherRecruiter, 'sanctum')
            ->postJson('/api/conversations', [
                'seekerId' => $this->seeker->id, 'jobId' => $this->job->id, 'body' => 'Hello',
            ])
            ->assertForbidden();

        $this->actingAs($this->seeker, 'sanctum')
            ->postJson('/api/conversations', [
                'seekerId' => $this->seeker->id, 'jobId' => $this->job->id, 'body' => 'Hello',
            ])
            ->assertForbidden();

        $id = $this->actingAs($this->recruiter, 'sanctum')
            ->postJson('/api/conversations', [
                'seekerId' => $this->seeker->id, 'jobId' => $this->job->id, 'body' => 'Hello',
            ])->json('data.conversation.id');

        $this->actingAs($stranger, 'sanctum')->getJson("/api/conversations/{$id}")->assertNotFound();
        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/conversations/{$id}/messages", ['body' => 'hi'])->assertNotFound();
    }

    private function apply(): JobApplication
    {
        $id = $this->actingAs($this->seeker, 'sanctum')
            ->postJson("/api/jobs/{$this->job->id}/apply", ['resumeId' => $this->resume->id])
            ->assertCreated()
            ->json('data.application.id');

        return JobApplication::findOrFail($id);
    }
}
