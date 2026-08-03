// CacheService — abstracted in-memory cache with TTL.
// Redis can be swapped in later by replacing the implementation.
// Phase 1 uses this both for general caching AND as the backing store for the
// in-memory rate limiter (see rate-limit.ts) and password-reset tokens.

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms; 0 = no expiry
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  /** Atomically read-modify-write via the updater. Returns the new value. */
  update<T>(
    key: string,
    updater: (current: T | null) => T,
    ttlSeconds?: number,
  ): Promise<T>;
  clear(): Promise<void>;
}

class InMemoryCacheService implements ICacheService {
  private store = new Map<string, CacheEntry<unknown>>();
  // Lock map to serialize concurrent updates to the same key (single-process).
  private locks = new Map<string, Promise<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt =
      ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Serialize concurrent updates per-key so a counter doesn't get lost.
  async update<T>(
    key: string,
    updater: (current: T | null) => T,
    ttlSeconds?: number,
  ): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    const next = prev.then(async () => {
      const current = await this.get<T>(key);
      const nextValue = updater(current);
      await this.set<T>(key, nextValue, ttlSeconds);
      return nextValue;
    });
    this.locks.set(key, next);
    try {
      return (await next) as T;
    } finally {
      // Clean up the lock entry to avoid unbounded growth.
      if (this.locks.get(key) === next) this.locks.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.locks.clear();
  }
}

export const cache: ICacheService = new InMemoryCacheService();
