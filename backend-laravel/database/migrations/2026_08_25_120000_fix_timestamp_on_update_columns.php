<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Stop MySQL from rewriting two expiry columns on every UPDATE.
 *
 * `rate_limit_buckets.window_end` and `ai_caches.expires_at` were declared as a
 * bare `$table->timestamp(...)`. MySQL promotes the first such column in a table
 * to `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`, so simply bumping
 * a bucket's count also reset the end of its window — the rate limit window
 * effectively never expired on schedule, and Retry-After was computed from a
 * value the database had overwritten. The AI cache had the same problem: every
 * write pushed the row's expiry to "now".
 *
 * Giving the columns an explicit DEFAULT suppresses the automatic ON UPDATE.
 */
return new class extends Migration
{
    /** @var array<string, string> table => column */
    private const COLUMNS = [
        'rate_limit_buckets' => 'window_end',
        'ai_caches' => 'expires_at',
    ];

    public function up(): void
    {
        // MySQL-specific column semantics; nothing to correct on SQLite, which
        // has no implicit ON UPDATE behaviour (the test suite runs there).
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        foreach (self::COLUMNS as $table => $column) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
                continue;
            }
            DB::statement(
                "ALTER TABLE `{$table}` MODIFY `{$column}` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"
            );
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        foreach (self::COLUMNS as $table => $column) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
                continue;
            }
            DB::statement(
                "ALTER TABLE `{$table}` MODIFY `{$column}` TIMESTAMP NOT NULL "
                ."DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
            );
        }
    }
};
