<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * Event → listener mappings.
     *
     * Most domain work is dispatched directly as a queued Job (app/Jobs/*) —
     * events are kept for cross-cutting concerns (audit logging, future
     * integrations) that aren't part of the core flow.
     *
     * @var array<class-string, list<class-string>>
     */
    protected $listen = [
        // Email verification is not implemented in v1 — the Registered event
        // has no listeners. Add SendEmailVerificationNotification here once
        // the User model implements MustVerifyEmail.
    ];

    public function boot(): void
    {
        //
    }

    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}
