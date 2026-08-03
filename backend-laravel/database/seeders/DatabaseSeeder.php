<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ResumeTemplateSeeder::class,
        ]);

        // Create a demo seeker + recruiter for local dev (optional).
        if (app()->environment('local', 'development')) {
            $this->seedDemoUsers();
        }
    }

    private function seedDemoUsers(): void
    {
        if (! User::where('email', 'seeker@example.com')->exists()) {
            User::create([
                'name' => 'Demo Seeker',
                'email' => 'seeker@example.com',
                'password_hash' => Hash::make('password123'),
                'role' => 'seeker',
            ]);
        }
        if (! User::where('email', 'recruiter@example.com')->exists()) {
            User::create([
                'name' => 'Demo Recruiter',
                'email' => 'recruiter@example.com',
                'password_hash' => Hash::make('password123'),
                'role' => 'recruiter',
            ]);
        }
    }
}
