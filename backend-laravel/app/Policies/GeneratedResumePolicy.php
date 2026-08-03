<?php

namespace App\Policies;

use App\Models\GeneratedResume;
use App\Models\User;

class GeneratedResumePolicy
{
    public function view(User $user, GeneratedResume $resume): bool
    {
        return $user->id === $resume->user_id;
    }

    public function update(User $user, GeneratedResume $resume): bool
    {
        return $user->id === $resume->user_id;
    }

    public function delete(User $user, GeneratedResume $resume): bool
    {
        return $user->id === $resume->user_id;
    }

    public function export(User $user, GeneratedResume $resume): bool
    {
        return $user->id === $resume->user_id;
    }

    public function tailor(User $user, GeneratedResume $resume): bool
    {
        return $user->id === $resume->user_id;
    }

    public function enhance(User $user, GeneratedResume $resume): bool
    {
        return $user->id === $resume->user_id;
    }

    public function viewVersions(User $user, GeneratedResume $resume): bool
    {
        return $user->id === $resume->user_id;
    }

    public function restore(User $user, GeneratedResume $resume): bool
    {
        return $user->id === $resume->user_id;
    }
}
