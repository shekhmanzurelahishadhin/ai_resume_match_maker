# Deployment Guide

Production hardening notes for Resume Matchmaker. Covers: MySQL migration,
Redis swap, S3/MinIO swap, Firebase Admin setup, reverse proxy (Caddy), and
backups.

---

## 1. MySQL Migration (SQLite → MySQL)

The Prisma schema is MySQL-compatible. To switch the production DB:

### 1.1 Update the Prisma datasource

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "mysql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

> **Note:** Prisma's `Json` type works on both SQLite and MySQL, but on
> MySQL it maps to `JSON` columns. The app's `*_json` fields will migrate
> cleanly. The `String` columns are identical. No schema changes are needed.

### 1.2 Set the DATABASE_URL

```bash
# .env.docker
DATABASE_URL=mysql://matchmaker:strong-password@mysql:3306/matchmaker
```

### 1.3 Apply the schema

For a **fresh DB** (recommended for first deploy):

```bash
docker compose exec app bunx prisma db push --accept-data-loss
```

For an **existing DB with migrations**:

```bash
# Create a migration from the schema diff
bunx prisma migrate dev --name init

# Apply migrations in production
docker compose exec app bunx prisma migrate deploy
```

### 1.4 Migrating existing SQLite data (optional)

If you have data in `db/custom.db` that you want to preserve:

1. Export: `sqlite3 db/custom.db .dump > dump.sql`
2. Strip SQLite-specific syntax (e.g., `AUTOINCREMENT`, `PRAGMA`).
3. Adjust the schema to MySQL syntax (backticks vs double-quotes).
4. Import: `docker compose exec -T mysql mysql -umatchmaker -p matchmaker < dump.mysql.sql`

For larger datasets, consider writing a one-off Node.js script that reads
from the SQLite Prisma client and writes to the MySQL Prisma client.

### 1.5 Connection pooling

Prisma 6 maintains its own connection pool. Tune it via the
`?connection_limit=N` query param in `DATABASE_URL`:

```
DATABASE_URL=mysql://user:pass@host:3306/db?connection_limit=20
```

For serverless / many short-lived processes, use PgBouncer (MySQL: use
ProxySQL or RDS Proxy).

---

## 2. Redis (Cache + Rate Limit + Reset Tokens)

The `CacheService` interface (`src/lib/cache.ts`) abstracts the backing
store. The default is in-memory; Redis is recommended for multi-instance
deployments.

### 2.1 Install ioredis

```bash
bun add ioredis
```

### 2.2 Implement RedisCacheService

Replace the body of `src/lib/cache.ts` with an implementation that uses
Redis. The interface is:

```ts
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  update<T>(key: string, updater: (current: T | null) => T, ttlSeconds?: number): Promise<T>;
  clear(): Promise<void>;
}
```

Sample Redis implementation (sketch — adapt to your needs):

```ts
import Redis from "ioredis";
import type { ICacheService } from "./cache";

class RedisCacheService implements ICacheService {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 3 });
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, raw, "EX", ttlSeconds);
    } else {
      await this.client.set(key, raw);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  // Redis doesn't have a built-in atomic read-modify-write for arbitrary
  // values. Use a Lua script or a WATCH/MULTI/EXEC transaction. For the
  // rate limiter, a Redis INCR with EXPIRE is simpler — see the rate
  // limiter note below.
  async update<T>(key: string, updater: (current: T | null) => T, ttlSeconds?: number): Promise<T> {
    const lua = `
      local cur = redis.call('GET', KEYS[1])
      local val = ARGV[1]
      redis.call('SET', KEYS[1], val)
      if tonumber(ARGV[2]) > 0 then
        redis.call('EXPIRE', KEYS[1], ARGV[2])
      end
      return val
    `;
    const current = await this.get<T>(key);
    const next = updater(current);
    await this.client.eval(lua, 1, key, JSON.stringify(next), String(ttlSeconds ?? 0));
    return next;
  }

  async clear(): Promise<void> {
    // FLUSHDB is destructive — only use in tests.
    await this.client.flushdb();
  }
}

const url = process.env.REDIS_URL;
export const cache: ICacheService = url
  ? new RedisCacheService(url)
  : new InMemoryCacheService();
```

### 2.3 Rate-limit optimization

For the rate limiter specifically, you can skip the JSON
serialize/deserialize and use Redis's atomic `INCR` + `EXPIRE` directly.
Replace `consumeRateLimit` in `src/lib/rate-limit.ts`:

```ts
import Redis from "ioredis";
const redis = new Redis(process.env.REDIS_URL!);

export async function consumeRateLimit(key: string, max: number, windowSeconds: number) {
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSeconds);
  }
  const ttl = await redis.ttl(redisKey);
  return {
    ok: count <= max,
    remaining: Math.max(0, max - count),
    retryAfter: Math.max(0, ttl),
    resetAt: Date.now() + ttl * 1000,
  };
}
```

### 2.4 What picks up Redis automatically

When you swap `cache` to Redis, the following all switch to Redis without
any code changes:

- `consumeRateLimit` (rate limiter) — buckets now shared across instances.
- Password-reset tokens — survive process restarts.
- Any future `cache.get/set` calls in the app.

The `/api/health` endpoint reports `cache: "redis"` when `REDIS_URL` is set
(it doesn't introspect the actual implementation — adjust if you wire a
non-REDIS_URL-based Redis connection).

---

## 3. S3 / MinIO (File Storage)

The `StorageService` interface (`src/lib/storage.ts`) abstracts the backend.
The default writes to local disk; S3/MinIO is recommended for production.

### 3.1 Install the AWS SDK

```bash
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 3.2 Implement S3StorageService

```ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import type { IStorageService, StoredFile } from "./storage";

class S3StorageService implements IStorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "us-east-1",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    this.bucket = process.env.S3_BUCKET!;
  }

  async saveFile(params: {
    userId: string;
    ownerId: string;
    fileName: string;
    mimeType: string;
    data: Buffer;
  }): Promise<StoredFile> {
    const safeName = params.fileName.replace(/[^\w.\-]+/g, "_");
    const suffix = crypto.randomBytes(4).toString("hex");
    const key = `${params.userId}/${params.ownerId}/${suffix}-${safeName}`;
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: params.data,
      ContentType: params.mimeType,
    }));
    return {
      key,
      absolutePath: key,
      fileName: params.fileName,
      size: params.data.length,
      mimeType: params.mimeType,
    };
  }

  async getFile(key: string): Promise<Buffer | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const bytes = await res.Body!.transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      return null;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch { /* best-effort */ }
  }

  async getSignedUrl(key: string, ttlSeconds = 300): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: ttlSeconds });
  }
}

const useS3 = process.env.S3_ENDPOINT && process.env.S3_BUCKET;
export const storage: IStorageService = useS3
  ? new S3StorageService()
  : new LocalDiskStorageService(process.env.UPLOADS_DIR ?? "/app/uploads");
```

### 3.3 MinIO setup

The `docker-compose.yml` ships MinIO + a `minio-init` sidecar that creates
the `resumes` bucket on first run. Set in `.env.docker`:

```bash
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=resumes
S3_ACCESS_KEY_ID=matchmaker       # = MINIO_ROOT_USER
S3_SECRET_ACCESS_KEY=matchmaker-secret  # = MINIO_ROOT_PASSWORD
S3_FORCE_PATH_STYLE=true          # required for MinIO
```

Access the MinIO console at <http://localhost:9001>.

---

## 4. Firebase Admin SDK Setup

The server uses `firebase-admin` to send FCM push notifications.

### 4.1 Get the service account JSON

1. Firebase Console → Project Settings → Service Accounts.
2. Click "Generate new private key" → a JSON file downloads.
3. The JSON has these fields:

```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

### 4.2 Derive the env vars

| Env var | JSON field |
|---------|------------|
| `FIREBASE_PROJECT_ID` | `project_id` |
| `FIREBASE_CLIENT_EMAIL` | `client_email` |
| `FIREBASE_PRIVATE_KEY` | `private_key` (keep the literal `\n` sequences — wrap the value in double quotes) |

### 4.3 Where the JSON file goes

You have two options:

**Option A: env vars only (recommended for Docker).** The app reads the
three env vars above and constructs the admin credential in
`src/lib/notifications/fcm.ts`. No JSON file on disk.

**Option B: mount the JSON file.** If you prefer to keep the full service
account JSON together:

```yaml
# docker-compose.yml override
services:
  app:
    volumes:
      - ./firebase-service-account.json:/app/firebase-service-account.json:ro
    environment:
      - GOOGLE_APPLICATION_CREDENTIALS=/app/firebase-service-account.json
```

Then `admin.initializeApp({ credential: admin.credential.applicationDefault() })`
reads the file. (The current `fcm.ts` uses Option A — adjust if you switch.)

### 4.4 Browser-side (NEXT_PUBLIC_FIREBASE_*)

These are baked into the client bundle at build time. Pass them via
`docker build --build-arg NEXT_PUBLIC_FIREBASE_*=...` (the
`docker-compose.yml` wires them through from `.env.docker` automatically).

Generate a Web Push VAPID key pair in Firebase Console → Project Settings
→ Cloud Messaging → Web Push certificates → "Generate key pair". Copy the
public key into `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.

---

## 5. Reverse Proxy (Caddy)

The project ships a `Caddyfile` at the project root. It listens on port 81
and:

1. **Default route** proxies everything to `localhost:3000` (the Next.js
   app) with proper `X-Forwarded-*` headers.
2. **`XTransformPort` query** — for API requests that target a different
   port (e.g. a mini-service on port 3030), add `?XTransformPort=3030` to
   the URL and Caddy proxies to `localhost:3030`. This is how the sandbox
   exposes multiple backend services through a single external port.

### 5.1 Production Caddyfile

For a real deployment with TLS:

```caddyfile
your-domain.com {
    encode gzip zstd
    reverse_proxy localhost:3000 {
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }

    # Static assets — let Caddy cache them at the edge.
    @static path /_next/static/* /favicon.ico /robots.txt /sw.js /firebase-messaging-sw.js
    handle @static {
        reverse_proxy localhost:3000
        header Cache-Control "public, max-age=31536000, immutable"
    }
}
```

Run Caddy:
```bash
caddy run --config Caddyfile
```

Caddy auto-provisions Let's Encrypt certificates for the configured domain.

### 5.2 Behind a load balancer

If you're behind AWS ALB / Cloudflare / nginx, set
`X-Forwarded-Proto=https` so NextAuth generates correct callback URLs.
NextAuth reads this via the `NEXTAUTH_URL` env var (set explicitly).

---

## 6. Backups

### 6.1 Database

**MySQL (production):**

```bash
# Manual dump
docker compose exec mysql mysqldump -umatchmaker -p matchmaker > backups/matchmaker-$(date +%F).sql

# Restore
docker compose exec -T mysql mysql -umatchmaker -p matchmaker < backups/matchmaker-2026-08-03.sql

# Automated (cron, 03:00 daily)
0 3 * * * docker compose exec -T mysql mysqldump -umatchmaker -p$MYSQL_PASSWORD matchmaker | gzip > /backups/matchmaker-$(date +\%F).sql.gz
```

**SQLite (dev):**

```bash
# Simple file copy (use .backup to avoid corruption mid-write)
sqlite3 db/custom.db ".backup backups/custom-$(date +%F).db"
```

### 6.2 Uploaded files

**Local disk:**

```bash
# Tar + gzip the uploads dir
tar -czf backups/uploads-$(date +%F).tar.gz uploads/

# Rotate old backups (keep 30 days)
find backups/ -name "uploads-*.tar.gz" -mtime +30 -delete
```

**S3 / MinIO:**

Use `aws s3 sync` (or `mc mirror` for MinIO) to copy to a backup bucket:

```bash
mc alias set src http://minio:9000 matchmaker matchmaker-secret
mc alias set dst s3://your-backup-bucket
mc mirror --overwrite src/resumes dst/resumes/$(date +%F)/
```

For production, enable S3 Bucket Versioning + Cross-Region Replication on
the bucket.

### 6.3 Redis

Redis persistence: the docker-compose stack runs Redis with `--appendonly yes`
(AOF mode). The `redis-data` volume persists across container restarts.

For off-host backups:

```bash
docker compose exec redis redis-cli BGSAVE
docker compose cp redis:/data/dump.rdb backups/redis-$(date +%F).rdb
```

### 6.4 Restoration testing

Test your backups monthly by restoring to a staging instance and running
`bun run test` against the restored DB. A backup you've never restored
from is a hope, not a backup.

---

## 7. Health Checks

The `/api/health` endpoint returns:

```json
{
  "status": "ok",
  "timestamp": "2026-08-03T07:30:00.000Z",
  "version": "0.2.1",
  "db": "connected",
  "cache": "memory"
}
```

- `status` is always `"ok"` (the endpoint doesn't 5xx on DB errors — it
  reports `db: "error"` instead, so load balancers don't blackhole the
  instance).
- `db` is `"connected"` if `SELECT 1` succeeds, `"error"` otherwise.
- `cache` is `"memory"` or `"redis"` based on whether `REDIS_URL` is set.

**Docker** uses this for its `HEALTHCHECK` (every 30s).

**Kubernetes** livenessProbe + readinessProbe:

```yaml
livenessProbe:
  httpGet: { path: /api/health, port: 3000 }
  initialDelaySeconds: 20
  periodSeconds: 30
readinessProbe:
  httpGet: { path: /api/health, port: 3000 }
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3
```

**Alerting:** alert on `db == "error"` for > 1 minute, or on HTTP 5xx for
`/api/health` itself.

---

## 8. Scaling Notes

### 8.1 Horizontal scaling

The app is stateless (JWT sessions, no server-side session store). Scale
horizontally behind a load balancer. **Caveats:**

- **Cache**: must use Redis (the in-memory cache doesn't sync across
  instances).
- **Rate limiter**: must use Redis (see §2.3).
- **Background work via `after()`**: Next.js 16's `after()` runs in the
  same process. If the process dies, the work is lost. For durable
  background work, move parsing/matching to a queue (BullMQ + Redis, or
  AWS SQS) and have the upload endpoint enqueue a job instead of using
  `after()`.
- **File storage**: must use S3 (local disk isn't shared across instances).

### 8.2 Database

- Use a managed MySQL (RDS / Cloud SQL / DigitalOcean Managed MySQL) for
  production.
- Connection pool: 20-50 connections per app instance. Prisma manages
  this automatically.
- Read replicas: Prisma doesn't natively support read replicas, but you
  can use `$replica`-style routing with a custom PrismaClient extension.

### 8.3 CDN

Serve static assets (`/_next/static/*`, `/public/*`) via a CDN. Caddy
already sets `Cache-Control: immutable` for hashed assets. For CloudFront
/ Cloudflare, point the distribution at the app origin and configure
cache behaviors for `/_next/static/*` to cache aggressively.

---

## 9. Security Checklist

- [ ] `NEXTAUTH_SECRET` is set to a 48+ char random string.
- [ ] `ADMIN_SECRET` is set to a 32+ char random string.
- [ ] `MYSQL_PASSWORD` / `MINIO_ROOT_PASSWORD` are strong + unique.
- [ ] HTTPS is enforced (Caddy auto-TLS, or behind an ALB).
- [ ] `HUGGINGFACE_API_KEY` is set if you want real AI inference.
- [ ] `FIREBASE_*` env vars are set if you want push notifications.
- [ ] `SMTP_*` env vars are set if you want email delivery.
- [ ] `/api/health` is reachable from the load balancer + monitoring.
- [ ] Database backups run on a schedule + are tested.
- [ ] Uploads are scanned for malware (ClamAV sidecar) — not yet
      implemented; on the roadmap.
- [ ] Rate limits are tuned to your traffic (defaults: 5 uploads/hour,
      10 generations/hour per user).
- [ ] CORS is locked down (default: same-origin only).
- [ ] CSP headers are set (consider `next-safe-middleware`).
