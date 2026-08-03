<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_returns_ok(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonStructure(['data' => ['status', 'timestamp', 'service', 'version', 'db', 'cache']]);
    }

    public function test_api_root_alias_returns_health(): void
    {
        $this->getJson('/api/')->assertStatus(200);
    }
}
