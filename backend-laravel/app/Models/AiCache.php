<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiCache extends Model
{
    use HasFactory;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $table = 'ai_caches';

    protected $fillable = [
        'cache_key',
        'result',
        'source',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'result' => 'array',
            'expires_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function scopeUnexpired(Builder $q): Builder
    {
        return $q->where('expires_at', '>', now());
    }

    public function isExpired(): bool
    {
        return $this->expires_at?->isPast() ?? true;
    }

    protected static function booted(): void
    {
        static::creating(function (self $cache) {
            if (empty($cache->id)) {
                $cache->id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }
}
