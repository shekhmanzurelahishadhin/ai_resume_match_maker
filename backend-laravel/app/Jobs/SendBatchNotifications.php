<?php

namespace App\Jobs;

use App\Services\FirebaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Batch push — used when fan-out to a topic (e.g. all seekers) is needed.
 */
class SendBatchNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 60;

    /**
     * @param list<string> $tokens
     * @param string $title
     * @param string $body
     * @param array<string,mixed> $data
     */
    public function __construct(
        public array $tokens,
        public string $title,
        public string $body,
        public array $data = [],
    ) {}

    public function handle(FirebaseService $firebase): int
    {
        if (! $firebase->isEnabled() || empty($this->tokens)) {
            return 0;
        }
        return $firebase->sendBatchNotifications($this->tokens, $this->title, $this->body, $this->data);
    }
}
