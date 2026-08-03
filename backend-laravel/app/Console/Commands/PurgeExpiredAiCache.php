<?php

namespace App\Console\Commands;

use App\Models\AiCache;
use Illuminate\Console\Command;

class PurgeExpiredAiCache extends Command
{
    protected $signature = 'ai:purge-cache';
    protected $description = 'Purge expired rows from the ai_caches table (scheduled 04:00 nightly).';

    public function handle(): int
    {
        $count = AiCache::where('expires_at', '<', now())->delete();
        $this->info("Purged {$count} expired AI cache rows.");
        return self::SUCCESS;
    }
}
