<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * Cache abstraction (§1 of spec).
 *
 * Default backing store is Redis (when CACHE_STORE=redis); automatically falls
 * back to the Laravel "file" store if Redis is unreachable. The interface is
 * intentionally minimal — get / put / forget / remember.
 */
class CacheService
{
    private ?\Illuminate\Contracts\Cache\Store $store = null;

    public function store(): \Illuminate\Contracts\Cache\Store
    {
        if ($this->store !== null) {
            return $this->store;
        }
        $default = config('cache.default', 'file');
        try {
            if ($default === 'redis') {
                // Safe connectivity probe — write+read a tiny throwaway key.
                $probe = cache()->store('redis');
                $probe->put('__cache_probe__', true, 5);
                $probe->get('__cache_probe__');
                $probe->forget('__cache_probe__');
            }
            $this->store = cache()->store($default)->getStore();
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'cache_redis_unavailable',
                'error' => $e->getMessage(), 'fallback' => 'file',
            ]));
            $this->store = cache()->store('file')->getStore();
        }
        return $this->store;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        $value = $this->store()->get($key);
        return $value ?? $default;
    }

    public function put(string $key, mixed $value, \DateTimeInterface|\DateInterval|int|null $ttl = null): bool
    {
        $ttl = $ttl ?? config('huggingface.cache_ttl_seconds', 604800);
        try {
            return $this->store()->put($key, $value, $ttl);
        } catch (\Throwable $e) {
            Log::warning(json_encode(['level' => 'warn', 'event' => 'cache_put_failed', 'error' => $e->getMessage()]));
            return false;
        }
    }

    public function forget(string $key): bool
    {
        try {
            return $this->store()->forget($key);
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function remember(string $key, callable $fn, ?int $ttlSeconds = null): mixed
    {
        $cached = $this->get($key);
        if ($cached !== null) {
            return $cached;
        }
        $value = $fn();
        $this->put($key, $value, $ttlSeconds);
        return $value;
    }

    public function flush(): bool
    {
        try {
            return $this->store()->flush();
        } catch (\Throwable $e) {
            return false;
        }
    }
}
