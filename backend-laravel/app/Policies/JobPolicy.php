<?php

namespace App\Policies;

use App\Models\JobPost;
use App\Models\User;

class JobPolicy
{
    public function view(User $user, JobPost $job): bool
    {
        // Seekers see active jobs; recruiters see their own (active or not).
        if ($user->isRecruiter()) {
            return $job->is_active || $user->id === $job->recruiter_id;
        }
        return $job->is_active;
    }

    public function update(User $user, JobPost $job): bool
    {
        return $user->isRecruiter() && $user->id === $job->recruiter_id;
    }

    public function delete(User $user, JobPost $job): bool
    {
        return $user->isRecruiter() && $user->id === $job->recruiter_id;
    }

    public function viewCandidates(User $user, JobPost $job): bool
    {
        return $user->isRecruiter() && $user->id === $job->recruiter_id;
    }
}
