<?php

namespace App\Policies;

use App\Models\JobApplication;
use App\Models\User;

class JobApplicationPolicy
{
    /** The applicant and the recruiter who owns the job. */
    public function view(User $user, JobApplication $application): bool
    {
        return $user->id === $application->seeker_id
            || $user->id === $application->jobPost?->recruiter_id;
    }

    public function updateStatus(User $user, JobApplication $application): bool
    {
        return $user->isRecruiter() && $user->id === $application->jobPost?->recruiter_id;
    }

    public function withdraw(User $user, JobApplication $application): bool
    {
        return $user->id === $application->seeker_id;
    }
}
