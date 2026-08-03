<?php

namespace App\Policies;

use App\Models\JobMatch;
use App\Models\User;

class MatchPolicy
{
    public function view(User $user, JobMatch $match): bool
    {
        // Seekers see matches for their own resume; recruiters see matches for their own job.
        return $user->id === $match->resume->user_id
            || $user->id === $match->recruiter_id;
    }

    public function viewByResume(User $user, JobMatch $match): bool
    {
        return $user->id === $match->resume->user_id;
    }

    public function viewByJob(User $user, JobMatch $match): bool
    {
        return $user->id === $match->recruiter_id;
    }
}
