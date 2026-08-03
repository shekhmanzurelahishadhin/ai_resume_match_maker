<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * Route model binding configuration. The api routes are loaded by
     * bootstrap/app.php with the `api` prefix + Sanctum middleware. We tune
     * UUID route binding here so {resume} / {job} / {match} params resolve
     * UUID keys directly (no explicit ->where('uuid', ...) needed per route).
     */
    public function boot(): void
    {
        Route::bind('resume', function (string $value) {
            return \App\Models\Resume::where('id', $value)->firstOrFail();
        });
        Route::bind('job', function (string $value) {
            return \App\Models\JobPost::where('id', $value)->firstOrFail();
        });
        Route::bind('match', function (string $value) {
            return \App\Models\JobMatch::where('id', $value)->firstOrFail();
        });
        Route::bind('generatedResume', function (string $value) {
            return \App\Models\GeneratedResume::where('id', $value)->firstOrFail();
        });
        Route::bind('notification', function (string $value) {
            return \App\Models\Notification::where('id', $value)->firstOrFail();
        });
        Route::bind('template', function (string $value) {
            // Allow template lookups by slug OR id.
            return \App\Models\ResumeTemplate::where('id', $value)
                ->orWhere('slug', $value)
                ->firstOrFail();
        });
    }
}
