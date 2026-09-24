<?php

namespace App\Providers;

use App\Models\GeneratedResume;
use App\Models\JobApplication;
use App\Models\JobMatch;
use App\Models\JobPost;
use App\Models\Notification;
use App\Models\Resume;
use App\Policies\GeneratedResumePolicy;
use App\Policies\JobApplicationPolicy;
use App\Policies\JobPolicy;
use App\Policies\MatchPolicy;
use App\Policies\NotificationPolicy;
use App\Policies\ResumePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model-to-policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected array $policies = [
        Resume::class => ResumePolicy::class,
        JobPost::class => JobPolicy::class,
        JobMatch::class => MatchPolicy::class,
        JobApplication::class => JobApplicationPolicy::class,
        GeneratedResume::class => GeneratedResumePolicy::class,
        Notification::class => NotificationPolicy::class,
    ];

    public function boot(): void
    {
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }
    }
}
