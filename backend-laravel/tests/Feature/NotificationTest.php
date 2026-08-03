<?php

namespace Tests\Feature;

use App\Models\DeviceToken;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_device_creates_a_token(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/notifications/register-device', [
                'deviceToken' => 'fake-fcm-token-1234567890',
                'deviceType' => 'web',
                'browserInfo' => 'Chrome 120 / macOS',
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('device_tokens', ['user_id' => $user->id]);
    }

    public function test_list_notifications_returns_only_owner_rows(): void
    {
        $user = User::factory()->create();
        Notification::create([
            'user_id' => $user->id,
            'type' => 'system',
            'title' => 'Hello',
            'body' => 'World',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications')
            ->assertStatus(200)
            ->assertJsonPath('data.total', 1);
    }

    public function test_mark_read_owner_scoped(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $notif = Notification::create([
            'user_id' => $owner->id,
            'type' => 'system',
            'title' => 'Hi',
            'body' => 'There',
        ]);

        $this->actingAs($other, 'sanctum')
            ->putJson("/api/notifications/{$notif->id}/read")
            ->assertStatus(404); // owner-scoped → 404 not 403 (no enumeration)
    }

    public function test_unread_count(): void
    {
        $user = User::factory()->create();
        Notification::create(['user_id' => $user->id, 'type' => 'system', 'title' => 'a', 'body' => 'b', 'is_read' => false]);
        Notification::create(['user_id' => $user->id, 'type' => 'system', 'title' => 'b', 'body' => 'c', 'is_read' => true]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications/unread-count')
            ->assertStatus(200)
            ->assertJsonPath('data.count', 1);
    }

    public function test_preferences_get_creates_defaults(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications/preferences')
            ->assertStatus(200)
            ->assertJsonPath('data.preferences.dailyDigest', false)
            ->assertJsonPath('data.preferences.jobMatches', true);
    }

    public function test_preferences_update(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/notifications/preferences', ['dailyDigest' => true])
            ->assertStatus(200)
            ->assertJsonPath('data.preferences.dailyDigest', true);
    }

    public function test_digest_run_requires_admin_secret(): void
    {
        $this->postJson('/api/notifications/digest/run')->assertStatus(401);

        $this->withHeader('x-admin-secret', 'test-admin-secret')
            ->postJson('/api/notifications/digest/run')
            ->assertStatus(200);
    }

    public function test_firebase_config_is_public(): void
    {
        $this->getJson('/api/notifications/firebase-config')
            ->assertStatus(200)
            ->assertJsonStructure(['data' => ['config', 'enabled']]);
    }
}
