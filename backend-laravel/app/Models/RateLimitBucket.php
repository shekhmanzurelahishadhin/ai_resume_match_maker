<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RateLimitBucket extends Model
{
    use HasFactory;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $table = 'rate_limit_buckets';

    protected $fillable = [
        'key',
        'count',
        'window_end',
    ];

    protected function casts(): array
    {
        return [
            'count' => 'integer',
            'window_end' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('window_end', '>', now());
    }

    public function isExhausted(int $max): bool
    {
        return $this->count >= $max;
    }

    public function retryAfterSeconds(): int
    {
        if (! $this->window_end) {
            return 0;
        }
        return max(0, (int) now()->diffInRealSeconds($this->window_end));
    }

    protected static function booted(): void
    {
        static::creating(function (self $bucket) {
            if (empty($bucket->id)) {
                $bucket->id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }
}
