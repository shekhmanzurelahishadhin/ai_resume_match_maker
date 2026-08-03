<?php

namespace App\Policies;

use App\Models\Resume;
use App\Models\User;

class ResumePolicy
{
    public function view(User $user, Resume $resume): bool
    {
        return $user->id === $resume->user_id;
    }

    public function update(User $user, Resume $resume): bool
    {
        return $user->id === $resume->user_id;
    }

    public function delete(User $user, Resume $resume): bool
    {
        return $user->id === $resume->user_id;
    }

    public function viewMatches(User $user, Resume $resume): bool
    {
        return $user->id === $resume->user_id;
    }

    public function analyze(User $user, Resume $resume): bool
    {
        return $user->id === $resume->user_id;
    }
}
