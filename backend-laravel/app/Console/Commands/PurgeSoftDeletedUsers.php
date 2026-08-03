<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class PurgeSoftDeletedUsers extends Command
{
    protected $signature = 'users:purge-deleted {--days=30 : Retention period in days}';
    protected $description = 'Hard-purge soft-deleted users older than the retention window (default 30 days, per §5).';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoff = Carbon::now()->subDays($days);

        $stale = User::onlyTrashed()->where('deleted_at', '<', $cutoff)->get();
        if ($stale->isEmpty()) {
            $this->info('No expired soft-deleted users to purge.');
            return self::SUCCESS;
        }

        $count = 0;
        foreach ($stale as $user) {
            $user->forceDelete();
            $count++;
            $this->line("  - purged {$user->email} (deleted at {$user->deleted_at})");
        }
        $this->info("Purged {$count} user(s) older than {$days} days.");
        return self::SUCCESS;
    }
}
