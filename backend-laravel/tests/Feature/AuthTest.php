<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_a_user_and_returns_a_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Alice Seeker',
            'email' => 'alice@example.com',
            'password' => 'super-secret-123',
            'role' => 'seeker',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['user' => ['id', 'name', 'email', 'role'], 'token']]);

        $this->assertDatabaseHas('users', ['email' => 'alice@example.com']);
        $this->assertDatabaseHas('notification_preferences', ['user_id' => $response->json('data.user.id')]);
    }

    public function test_register_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'dup@example.com']);

        $this->postJson('/api/register', [
            'name' => 'Dup',
            'email' => 'dup@example.com',
            'password' => 'password123',
            'role' => 'seeker',
        ])->assertStatus(409)
            ->assertJsonPath('error.code', 'EMAIL_TAKEN');
    }

    public function test_login_returns_a_token_for_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'login@example.com',
            'password_hash' => bcrypt('password123'),
        ]);

        $this->postJson('/api/login', [
            'email' => 'login@example.com',
            'password' => 'password123',
        ])->assertStatus(200)
            ->assertJsonStructure(['data' => ['user', 'token']]);
    }

    public function test_login_rejects_bad_password(): void
    {
        User::factory()->create([
            'email' => 'bad@example.com',
            'password_hash' => bcrypt('password123'),
        ]);

        $this->postJson('/api/login', [
            'email' => 'bad@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(401)
            ->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_user_endpoint_requires_auth(): void
    {
        $this->getJson('/api/user')->assertStatus(401);
    }

    public function test_authenticated_user_can_fetch_profile(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/user')
            ->assertStatus(200)
            ->assertJsonPath('data.user.id', $user->id);
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/logout')
            ->assertStatus(200);

        // The guard caches the resolved user for the lifetime of the test
        // process; a real second request would start clean, so drop it here.
        $this->app['auth']->forgetGuards();

        // Re-using the same token should fail.
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/user')
            ->assertStatus(401);
    }
}
