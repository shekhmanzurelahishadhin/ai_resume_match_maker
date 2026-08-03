<?php

namespace App\Console\Commands;

use App\Jobs\SendDailyDigest;
use Illuminate\Console\Command;

class SendDailyDigestCommand extends Command
{
    protected $signature = 'notifications:send-daily-digest';
    protected $description = 'Compile and send the daily digest email to every subscribed user (scheduled 09:00).';

    public function handle(): int
    {
        $this->info('Dispatching daily digest job...');
        SendDailyDigest::dispatch();
        $this->info('Dispatched. Run a queue worker (`php artisan queue:work`) to process it.');

        // Optionally run synchronously if --sync is passed.
        if ($this->hasOption('sync') && $this->option('sync')) {
            $this->info('Running synchronously...');
            $sent = app(SendDailyDigest::class)->handle(app(\App\Services\NotificationService::class));
            $this->info("Sent {$sent} digests.");
        }

        return self::SUCCESS;
    }

    protected function getOptions(): array
    {
        return [
            ['sync', null, \Symfony\Component\Console\Input\InputOption::VALUE_NONE, 'Run synchronously instead of dispatching a job.'],
        ];
    }
}
