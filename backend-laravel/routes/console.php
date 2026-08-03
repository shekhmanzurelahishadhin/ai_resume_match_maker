<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// §7: daily digest at 09:00 user-local (we approximate with server TZ —
// per-user timezone staggering is on the roadmap).
Schedule::command('notifications:send-daily-digest')
    ->dailyAt('09:00')
    ->withoutOverlapping()
    ->runInBackground();

// §5 retention: purge soft-deleted users older than 30 days.
Schedule::command('users:purge-deleted')
    ->dailyAt('03:00')
    ->withoutOverlapping();

// AI cache TTL sweep (expired rows are lazy-deleted on read, but we sweep
// nightly to keep the table small).
Schedule::command('ai:purge-cache')
    ->dailyAt('04:00')
    ->withoutOverlapping();
