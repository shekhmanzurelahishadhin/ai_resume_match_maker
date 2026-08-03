# Resume Matchmaker

> Next.js 16 fullstack adaptation of the Laravel + Next.js "Resume Matchmaker"
> spec. Job seekers upload PDF resumes; AI extracts their skills and matches
> them against recruiter job posts. Recruiters see ranked, privacy-respecting
> candidate lists. Built-in resume builder, push notifications, daily digest,
> and a Docker-ready production stack.

---

## 1. Project Overview

**Resume Matchmaker** connects two audiences:

- **Job seekers** upload a PDF resume. The app extracts the text, identifies
  skills via Hugging Face (with a deterministic dictionary fallback), and
  computes a match percentage against every active job post.
- **Recruiters** post jobs with required skills. The app ranks every
  ready resume against the job and surfaces privacy-respecting candidate
  cards (skills + experience + matched/missing skills — never the raw
  resume text).

**Core concept (from §2 of the spec):**
- Privacy by design — seekers' raw resume text never leaves the seeker's
  ownership. Recruiters see *metadata* (skills, experience, match %),
  not the underlying PDF.
- AI with a fallback — every AI call has a deterministic degraded path.
  When `HUGGINGFACE_API_KEY` is unset (or the HF API is unreachable), the
  app falls back to a curated 230+ skill dictionary + TF-IDF cosine
  similarity. The match source (`ai` vs `fallback`) is annotated on every
  Match row and surfaced in the UI as an "AI-verified" or "Estimated" badge.
- Resume generation — seekers can convert their extracted profile into one
  of 6 styled templates (modern-clean, professional-classic, creative,
  executive, technical, academic) and export to PDF / DOCX / HTML.

---

## 2. Architecture

### Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Unified frontend + REST API in one Node.js process. The spec called for Laravel 12 + Next.js, but the sandbox runtime is Node-only — we adapt the architecture while preserving every endpoint from §9 of the spec 1:1 under `/api/**`. |
| Language | TypeScript 5 | End-to-end type safety. |
| ORM | Prisma 6 | Schema-as-code, type-safe client, supports both SQLite (dev) and MySQL (prod) by changing one line. |
| Database | SQLite (dev) / MySQL 8 (prod) | SQLite for zero-config local dev. The schema is MySQL-compatible — swap the `datasource` provider and run `prisma migrate deploy`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). |
| Cache | In-memory `Map` (dev) / Redis (prod) | The `CacheService` interface (`src/lib/cache.ts`) abstracts the backing store so Redis can be swapped in without touching call sites. |
| File storage | Local disk (dev) / S3 / MinIO (prod) | The `StorageService` interface (`src/lib/storage.ts`) abstracts the backend. |
| Auth | NextAuth.js v4 (Credentials + JWT) | Stateless JWT sessions scale horizontally; the JWT carries `id` + `role` so route handlers authorize without an extra DB lookup. |
| UI | Tailwind CSS 4 + shadcn/ui (New York) | Consistent, accessible, themeable. |
| State | Zustand (client) + TanStack Query (server) | Minimal boilerplate, normalized caching. |
| AI | `@huggingface/inference` (NER + cross-encoder + zero-shot) | Server-only. Retries 3× with exponential backoff, falls back to dictionary + TF-IDF on any error. |
| Notifications | `firebase-admin` (FCM) + `nodemailer` (SMTP) | Both gracefully no-op when env vars are missing. |
| Tests | Vitest + supertest | Route handlers are called directly — no dev server required. |
| Container | Docker (multi-stage) + docker-compose | Production-ready image; full stack with MySQL + Redis + MinIO. |

### Why Next.js 16 instead of Laravel?

The original spec called for Laravel 12 (PHP) + Next.js 16. The sandbox only
runs Node.js, so we collapsed both into a single Next.js app. **Every
endpoint from §9 of the spec is preserved 1:1** under `/api/**` — the
request/response shapes are identical to what a Laravel implementation would
produce. The Prisma schema is MySQL-compatible, so swapping to a Laravel
backend later would only require regenerating the OpenAPI client.

### How Prisma/SQLite/MySQL swap works

The Prisma `datasource` block in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"   // ← change to "mysql" for production
  url      = env("DATABASE_URL")
}
```

Change the provider, set `DATABASE_URL=mysql://...`, run `prisma migrate
deploy`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full recipe.

### How Redis plugs in

`src/lib/cache.ts` defines an `ICacheService` interface. The default
implementation is an in-memory `Map` with TTL + per-key serialized updates.
To swap in Redis:

1. `bun add ioredis`
2. Implement `RedisCacheService` against `ICacheService` (the in-memory
   class is ~70 lines — a Redis version is roughly the same size).
3. Export the Redis instance from `src/lib/cache.ts` when `REDIS_URL` is set.
4. The rate limiter (`src/lib/rate-limit.ts`) and the password-reset token
   store both consume `ICacheService`, so they pick up Redis automatically.

### How S3/MinIO plugs in

`src/lib/storage.ts` defines an `IStorageService` interface with four
methods (`saveFile`, `getFile`, `deleteFile`, `getSignedUrl`). The default
implementation writes to local disk. To swap in S3/MinIO:

1. `bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
2. Implement `S3StorageService` against `IStorageService`.
3. Export the S3 instance from `src/lib/storage.ts` when `S3_ENDPOINT` is set.

---

## 3. Phase Status

| Phase | Status | Features |
|-------|--------|----------|
| **1** | ✅ Done | Auth (register, login, forgot/reset password, NextAuth JWT sessions), resume upload + PDF parsing, AI skill extraction (HF + dictionary fallback), experience-year heuristic, AI matching (semantic 70% + skills overlap 30%, 7-day AiCache), recruiter job CRUD, candidate ranking with privacy, dashboard for seekers + recruiters, data export + account deletion |
| **2** | ✅ Done | 6 resume templates (modern-clean, professional-classic, creative, executive, technical, academic), Handlebars-based rendering, customization (colors, fonts, spacing), version history with restore, PDF/DOCX/HTML export, AI-powered tailoring + enhancement |
| **3** | ✅ Done | Firebase Cloud Messaging push (graceful no-op when unconfigured), SMTP email (dev-mode console logging), notification center page + bell dropdown, 6 preference toggles, event triggers (new job, new match ≥70%, resume analysis complete), daily digest sender, service worker |
| **4** | ✅ Done | Docker multi-stage build + docker-compose stack (app + MySQL + Redis + MinIO), `/api/health` endpoint, Vitest + supertest test suite (30 tests across 7 files), comprehensive README, `.env.example`, `docs/DEPLOYMENT.md` |

---

## 4. Quick Start (Local Dev)

```bash
# 1. Install deps
bun install

# 2. Set up the database (SQLite — zero config)
bun run db:push

# 3. Seed the 6 resume templates
bun run db:seed-templates

# 4. Copy env vars (optional — defaults work for local dev)
cp .env.example .env
# Edit .env to set NEXTAUTH_SECRET (openssl rand -base64 48)

# 5. Start the dev server
bun run dev
```

The app boots at <http://localhost:3000>. Register as a seeker or recruiter
and start uploading resumes / posting jobs.

> **Sandbox note:** the dev server runs automatically. Don't run `bun run dev`
> yourself — use the Preview Panel on the right to view the app.

---

## 5. Environment Variables

| Variable | Required? | Default | Description |
|----------|-----------|---------|-------------|
| `DATABASE_URL` | ✅ | `file:./db/custom.db` | Prisma datasource URL. SQLite path or `mysql://user:pass@host:port/db`. |
| `NEXTAUTH_SECRET` | ✅ | — | JWT signing secret. Generate with `openssl rand -base64 48`. |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | Public-facing app URL (used for callbacks + the SW config endpoint). |
| `HUGGINGFACE_API_KEY` | ❌ | `""` | HF Inference API key. Empty → AI fallback (dictionary + TF-IDF). |
| `FIREBASE_PROJECT_ID` | ❌ | `""` | Firebase Admin SDK — project ID. |
| `FIREBASE_CLIENT_EMAIL` | ❌ | `""` | Firebase Admin SDK — client email from service account JSON. |
| `FIREBASE_PRIVATE_KEY` | ❌ | `""` | Firebase Admin SDK — private key (with literal `\n` sequences). |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ❌ | `""` | Firebase client SDK — API key (baked into client bundle at build time). |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ❌ | `""` | Firebase client SDK — auth domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ❌ | `""` | Firebase client SDK — project ID. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ❌ | `""` | Firebase client SDK — storage bucket. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ❌ | `""` | Firebase client SDK — messaging sender ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ❌ | `""` | Firebase client SDK — app ID. |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | ❌ | `""` | Web Push VAPID key pair (Firebase Console → Cloud Messaging → Web Push certificates). |
| `SMTP_HOST` | ❌ | `""` | SMTP server host. Empty → emails logged to stdout. |
| `SMTP_PORT` | ❌ | `587` | SMTP server port. |
| `SMTP_SECURE` | ❌ | `false` | Use TLS (`true` for port 465). |
| `SMTP_USER` | ❌ | `""` | SMTP auth username. |
| `SMTP_PASS` | ❌ | `""` | SMTP auth password. |
| `SMTP_FROM` | ❌ | `noreply@resumematchmaker.local` | `From:` header for outgoing emails. |
| `ADMIN_SECRET` | ❌ | `""` | Required to call `POST /api/notifications/digest/run`. Empty → 401 always. |
| `UPLOAD_DIR` / `UPLOADS_DIR` | ❌ | `/home/z/my-project/uploads` | Local disk root for uploaded resumes. (`UPLOADS_DIR` is the canonical name; `UPLOAD_DIR` is an alias.) |
| `S3_ENDPOINT` | ❌ | `""` | S3/MinIO endpoint. Empty → local disk. |
| `S3_REGION` | ❌ | `""` | S3 region (e.g. `us-east-1`). |
| `S3_BUCKET` | ❌ | `""` | S3 bucket name. |
| `S3_ACCESS_KEY_ID` | ❌ | `""` | S3 access key. |
| `S3_SECRET_ACCESS_KEY` | ❌ | `""` | S3 secret key. |
| `REDIS_URL` | ❌ | `""` | Redis URL. Empty → in-memory cache. |
| `NODE_ENV` | ❌ | `development` | Node environment. |

---

## 6. Docker Deployment

### Full stack (recommended)

```bash
# 1. Copy the env template + edit secrets
cp .env.docker.example .env.docker
# Edit .env.docker — set NEXTAUTH_SECRET, ADMIN_SECRET, MYSQL_PASSWORD,
# MINIO_ROOT_PASSWORD, etc.

# 2. Build + start everything (app, MySQL, Redis, MinIO, minio-init)
docker compose up -d --build

# 3. Apply the Prisma schema to MySQL (one-time per fresh DB)
docker compose exec app bunx prisma db push --accept-data-loss
# (Or use `prisma migrate deploy` if you've created migrations.)

# 4. Seed the resume templates
docker compose exec app bun run db:seed-templates

# 5. Tail logs
docker compose logs -f app
```

The app is at <http://localhost:3000>, MinIO console at
<http://localhost:9001> (use the `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
from `.env.docker`).

### Dev override (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Mounts the project source so file changes trigger Next.js HMR. Uses SQLite
by default (overridable via `DATABASE_URL` in the dev override).

### Swapping SQLite → MySQL

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full recipe. Summary:

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to
   `provider = "mysql"`.
2. Set `DATABASE_URL=mysql://matchmaker:matchmaker@mysql:3306/matchmaker`
   in `.env.docker`.
3. Run `docker compose exec app bunx prisma migrate deploy` (or
   `prisma db push --accept-data-loss` for a schema-only push).

### Swapping in-memory cache → Redis

The docker-compose stack already ships Redis. To wire the app to use it:

1. Set `REDIS_URL=redis://redis:6379` in `.env.docker` (already the default).
2. Implement a `RedisCacheService` against the `ICacheService` interface
   in `src/lib/cache.ts` (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).
3. The rate limiter + password-reset tokens pick up Redis automatically.

### Swapping local disk → S3/MinIO

The docker-compose stack ships MinIO (S3-compatible). To wire the app to
use it:

1. Set `S3_ENDPOINT=http://minio:9000`, `S3_BUCKET=resumes`,
   `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` in `.env.docker`.
2. Implement an `S3StorageService` against the `IStorageService` interface
   in `src/lib/storage.ts` (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

---

## 7. API Reference

All endpoints are under `/api/**`. Authenticated endpoints require a
NextAuth JWT session cookie. Responses follow `{ data?: ... }` on success
and `{ error: { message, code, ... } }` on failure.

### Phase 1 — Auth + Resumes + Jobs + Matches

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/register` | public | Create a seeker or recruiter. Body: `{ name, email, password, role }`. 201 on success, 409 if email taken, 422 on validation. |
| POST | `/api/login` | public | Validate credentials (REST alias for the NextAuth callback). Returns the user on 200; 401 on bad password. |
| POST | `/api/logout` | auth | Clear the session cookie. |
| GET | `/api/auth/[...nextauth]` | public | NextAuth handler (GET + POST). |
| POST | `/api/forgot-password` | public | Generate a 1-hour reset token. Returns it in `devOnly` (sandbox — no SMTP). |
| POST | `/api/reset-password` | public | Consume the token + set a new password. Body: `{ token, password }`. |
| GET | `/api/user` | auth | Current authenticated user. |
| GET | `/api/resumes` | auth | Paginated list of the user's resumes. |
| POST | `/api/resumes/upload` | seeker | Multipart PDF upload. Rate-limited 5/hour. |
| GET | `/api/resumes/{id}` | auth (owner) | Resume detail (skills, experience, status). |
| DELETE | `/api/resumes/{id}` | auth (owner) | Delete the file + record. |
| GET | `/api/resumes/{id}/status` | auth (owner) | Parse status (`pending` / `parsing` / `ready` / `failed`). |
| GET | `/api/resumes/{id}/matches` | auth (owner) | Paginated matches for the resume. |
| POST | `/api/resumes/{id}/analyze` | auth (owner) | Re-run parsing + matching. |
| GET | `/api/jobs` | auth | Seekers see active jobs; recruiters see own. |
| POST | `/api/jobs` | recruiter | Create a job. Triggers `matchJobAgainstAllResumes` + `notifySeekersOfNewJob` via `after()`. |
| GET | `/api/jobs/{id}` | auth | Job detail. |
| PUT | `/api/jobs/{id}` | recruiter (owner) | Update. Re-runs matching if skills change. |
| DELETE | `/api/jobs/{id}` | recruiter (owner) | Delete. |
| GET | `/api/jobs/{id}/candidates` | recruiter (owner) | Ranked candidates for the job (privacy-respecting — no extracted text). |
| GET | `/api/matches/{id}` | auth (owner) | Single match detail. |
| GET | `/api/matches/resume/{resumeId}` | auth (owner) | Matches for a resume. |
| GET | `/api/matches/job/{jobId}` | recruiter (owner) | Matches for a job. |
| GET | `/api/users/me` | auth | Profile. |
| PATCH | `/api/users/me` | auth | Update name. |
| DELETE | `/api/users/me` | auth | Delete account (cascades). |
| POST | `/api/users/export-data` | auth | GDPR-style data export (JSON of all the user's data). |
| GET | `/api/storage/{key}` | auth (owner) | Stream an uploaded file (owner-checked). |

### Phase 2 — Resume Builder

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/templates` | auth | List all 6 templates. |
| GET | `/api/templates/{slug}` | auth | Template metadata. |
| POST | `/api/resumes/generate` | auth | Create a new generated resume (picks template + content). |
| GET | `/api/resumes/generate/{id}` | auth (owner) | Get a generated resume. |
| PUT | `/api/resumes/generate/{id}` | auth (owner) | Update content / customization. |
| DELETE | `/api/resumes/generate/{id}` | auth (owner) | Delete. |
| GET | `/api/resumes/generate/{id}/preview` | auth (owner) | Rendered HTML preview. |
| POST | `/api/resumes/generate/{id}/export` | auth (owner) | Export to PDF / DOCX / HTML. Returns a download URL. |
| POST | `/api/resumes/generate/{id}/tailor` | auth (owner) | AI-tailor the resume to a specific job. Rate-limited 10/hour. |
| POST | `/api/resumes/generate/{id}/enhance` | auth (owner) | AI-enhance a section (grammar, style, content). |
| GET | `/api/resumes/generate/{id}/versions` | auth (owner) | Version history. |
| POST | `/api/resumes/generate/{id}/versions/{version}/restore` | auth (owner) | Restore a previous version. |

### Phase 3 — Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/notifications/register-device` | auth | Register / refresh a device token (FCM). Body: `{ deviceToken, deviceType, browserInfo? }`. |
| DELETE | `/api/notifications/device/{token}` | auth (owner) | Deactivate a device token (soft delete). |
| GET | `/api/notifications` | auth | Paginated list (`?unreadOnly=true&page=1&pageSize=15`). |
| PUT | `/api/notifications/{id}/read` | auth (owner) | Mark one as read. |
| PUT | `/api/notifications/read-all` | auth | Mark all unread as read. |
| GET | `/api/notifications/unread-count` | auth | Just the count (for the bell badge). |
| GET | `/api/notifications/preferences` | auth | Get the user's 6 toggles (auto-creates defaults). |
| PUT | `/api/notifications/preferences` | auth | Update toggles. |
| POST | `/api/notifications/digest/run` | admin (`x-admin-secret` header) | Manually trigger the daily digest sender. |
| GET | `/api/notifications/firebase-config` | public | Returns the browser Firebase config (sourced from `NEXT_PUBLIC_FIREBASE_*` env vars; no secrets). |

### Phase 4 — Operations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | public | `{ status, timestamp, version, db, cache }`. Used by Docker healthcheck + load balancers. |
| GET | `/api` | public | Root index (sanity check). |

---

## 8. AI Integration & Fallback

Every AI call returns `{ result, source: 'ai' | 'fallback' }`. The fallback
path is the **single source of truth** for degraded mode — when HF is
unreachable, the app doesn't 500; it returns a result annotated with
`source: 'fallback'` and the UI shows an "Estimated" badge instead of
"AI-verified".

| Operation | AI model | Fallback | When fallback fires |
|-----------|----------|----------|---------------------|
| Skill extraction | `dslim/bert-base-NER` | Curated 230+ skill dictionary across 5 categories (Technical, Tools, Soft Skills, Domain, Languages). Whole-word case-insensitive match with multi-word normalization. | Empty API key, HF 5xx, network error, malformed response, 3 retries exhausted. |
| Resume → Job matching | `cross-encoder/ms-marco-MiniLM-L-6-v2` (semantic similarity) | TF-IDF cosine similarity over the resume text + job text. | Same triggers as above. |
| Skill categorization | `facebook/bart-large-mnli` (zero-shot) | Static lookup table built into the dictionary. | Same. |
| Resume tailoring | Hugging Face text-generation | Template-based bullet rewriting using the extracted skills + job description. | Same. |
| Resume enhancement | Hugging Face text-generation | Rule-based grammar + style fixes (capitalization, action verbs). | Same. |

**Retry policy:** 3 attempts with exponential backoff (2s, 4s, 8s). Every
fallback trigger logs a structured JSON line:

```json
{"level":"warn","event":"ai_fallback","operation":"extract_skills","reason":"attempt 3 failed","willRetry":false}
```

**Enabling real AI:** set `HUGGINGFACE_API_KEY=hf_...` in `.env` and
restart the dev server. All calls automatically switch to the AI path.
Match results are cached for 7 days (Prisma `AiCache` table, keyed on
`md5(resumeText + jobText)`).

---

## 9. Privacy & Retention

### What's stored

| Table | Purpose | Retention |
|-------|---------|-----------|
| `User` | Account + role. | Until account deletion. |
| `Resume` | File metadata + extracted text + skills + experience. The `extractedText` column is the only place the raw text lives. | Until the user deletes the resume. |
| `JobPost` | Recruiter job posts + required skills. | Until the recruiter deletes the job. |
| `Match` | Resume × job score + matched/missing skills. | Cascades with resume/job deletion. |
| `GeneratedResume` | Builder content + customization + exported file paths. | Until the user deletes it. |
| `DeviceToken` | FCM push tokens. Soft-deleted when FCM returns `UNREGISTERED`. | Until the user signs out / revokes. |
| `Notification` | In-app notification history. | Until the user deletes their account. |
| `NotificationPreference` | 6 boolean toggles. | Until account deletion. |
| `AiCache` | Cached AI results (7-day TTL). | Auto-expired. |
| `RateLimitBucket` | Rate-limit counters. | Auto-expired. |

### Privacy boundaries

- **Seekers own their resumes.** The `extractedText` column is never exposed
  to recruiters. Recruiter-facing endpoints (`/api/jobs/{id}/candidates`,
  `/api/matches/job/{jobId}`) return only `skills`, `experienceYears`,
  `matchedSkills`, `missingSkills`, and `matchPercentage`.
- **Notifications are owner-scoped.** The list endpoint filters by `userId`;
  the mark-as-read endpoint verifies ownership before updating. Another
  user's notification ID returns 404 (not 403 — no enumeration).
- **Device tokens are owner-scoped.** Deactivation checks `userId`.

### Export

`POST /api/users/export-data` returns a JSON document with all of the
user's data (profile, resumes, jobs, matches, generated resumes,
notifications, device tokens, preferences). Intended for GDPR compliance.

### Deletion

`DELETE /api/users/me` cascades to every related table (resumes, jobs,
matches, generated resumes, device tokens, notifications, preferences).
Uploaded files on disk are best-effort deleted.

### Encryption notes

- **At rest:** SQLite files inherit the host filesystem's encryption
  (operator responsibility). MySQL operators should enable Transparent
  Data Encryption (TDE) or use encrypted volumes.
- **In transit:** all API traffic should be HTTPS (the Caddyfile
  reverse proxy handles TLS termination — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).
- **Passwords:** bcrypt with 10 rounds (configurable via `BCRYPT_ROUNDS`).
- **JWTs:** signed with `NEXTAUTH_SECRET` (HMAC-SHA256). 30-day max age.
- **Reset tokens:** 32 random bytes, stored in the cache with a 1-hour TTL.
  In sandbox (no SMTP) the token is returned in a `devOnly` field for
  testing — never in production.

---

## 10. Rate Limiting

| Bucket | Limit | Window | Key | Endpoint |
|--------|-------|--------|-----|----------|
| General API | 60 req | 60s | user id | All `/api/**` (Phase 1 constant ready; not yet enforced per-route). |
| Resume upload | 5 req | 1h | `resume_upload:user:<id>` | `POST /api/resumes/upload` |
| Resume generation | 10 req | 1h | `resume_generate:user:<id>` | `POST /api/resumes/generate/{id}/tailor`, `/enhance` |

When a bucket is exhausted, the endpoint returns `429 Too Many Requests`
with a `Retry-After: <seconds>` header and body
`{ error: { message, code: "RATE_LIMITED" } }`.

The limiter is backed by `CacheService` (in-memory by default; Redis when
`REDIS_URL` is set). Multi-instance deployments MUST use Redis — the
in-memory limiter only works for a single-process server.

---

## 11. Resume Generation

6 templates, each with a Handlebars template + metadata:

| Slug | Style | Best for |
|------|-------|----------|
| `modern-clean` | Sans-serif, generous whitespace, accent color | Tech / startup roles |
| `professional-classic` | Serif, conservative, traditional | Finance / law / enterprise |
| `creative` | Colorful, asymmetric, sidebar layout | Design / marketing |
| `executive` | Two-column, serif, dense | Senior leadership |
| `technical` | Skills-forward, monospace accents | Engineering |
| `academic` | Citation-friendly, minimal | Academia / research |

### Formats

| Format | Engine | Caveats |
|--------|--------|---------|
| **HTML** | Handlebars → HTML | Pixel-perfect (the canonical source of truth). |
| **PDF** | HTML → `pdf-lib` rendering | Layout-accurate for the included templates. |
| **DOCX** | Programmatic XML construction via JSZip | **Content-accurate, layout-approximate.** DOCX doesn't have CSS — the conversion preserves all text + structure (headings, lists, tables) but visual fidelity (colors, fonts, spacing) is approximate. Recruiters who need pixel-perfect rendering should request PDF. |

### Customization

Each generated resume stores a `customizationJson` field:
```ts
{
  primaryColor: string;     // hex
  fontFamily: string;       // 'inter' | 'merriweather' | 'robotomono' | ...
  spacing: 'compact' | 'normal' | 'relaxed';
  fontSize: 'small' | 'medium' | 'large';
}
```

### Versions

Every save creates a `ResumeVersion` row. The user can preview + restore any
prior version. The "current" version is tracked via `isCurrent: true` on
the `GeneratedResume`.

---

## 12. Notifications

### Channels

1. **In-app** — always on. Every notification persists to the `Notification`
   table and surfaces in the bell dropdown + notification center page.
2. **Push (FCM)** — when `FIREBASE_*` env vars are set, every active
   `DeviceToken` for the user receives a push. Falls back silently otherwise.
3. **Email** — `nodemailer` over SMTP. Falls back to `console.log` when
   `SMTP_HOST` is empty.

### FCM setup

1. Create a Firebase project at <https://console.firebase.google.com>.
2. Add a Web App → copy the `NEXT_PUBLIC_FIREBASE_*` values into `.env`.
3. Generate a Web Push VAPID key pair (Project Settings → Cloud Messaging
   → Web Push certificates) → set `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
4. Project Settings → Service Accounts → "Generate new private key" →
   download the JSON. Derive:
   - `FIREBASE_PROJECT_ID` ← `project_id`
   - `FIREBASE_CLIENT_EMAIL` ← `client_email`
   - `FIREBASE_PRIVATE_KEY` ← `private_key` (with literal `\n` sequences)
5. Restart the dev server. The browser will prompt for notification
   permission on the dashboard.

### Service worker

`public/firebase-messaging-sw.js` is the Firebase Messaging SW. It fetches
its config from the public `/api/notifications/firebase-config` endpoint
at install time, so no secrets are baked into the static SW file.
`public/sw.js` is a generic app-shell SW (network-first for navigations,
stale-while-revalidate for static assets, no API caching).

### Daily digest

`sendDailyDigest()` (in `src/lib/notifications/daily-digest.ts`) queries
users with `dailyDigest=true AND emailNotifications=true`, compiles their
last-24h notifications + unread count, and emails a summary per user.

Trigger it manually:
```bash
curl -X POST \
  -H "x-admin-secret: $ADMIN_SECRET" \
  http://localhost:3000/api/notifications/digest/run
```

In production, schedule a cron at 09:00 user-local time. The endpoint is
admin-only and guarded by `ADMIN_SECRET`. When `ADMIN_SECRET` is unset, the
endpoint always returns 401 (fail-closed).

### Preferences

6 toggles (`NotificationPreference` row, auto-created on register):

| Field | Default | Gates |
|-------|---------|-------|
| `emailNotifications` | true | All email fan-out |
| `pushNotifications` | true | All FCM fan-out |
| `jobMatches` | true | `job_match` notification type |
| `resumeAnalysis` | true | `resume_analysis` type |
| `newJobs` | true | `new_job` type |
| `dailyDigest` | false | Daily digest email |

`system` and `daily_digest` types bypass the per-type gate (system messages
always reach the user; the digest itself is gated by `dailyDigest`).

---

## 13. Testing

```bash
# Run the full suite (30 tests across 7 files, ~13s)
bun run test

# Watch mode
bun run test:watch

# With coverage
bun run test:coverage
```

### Coverage

| File | What it covers |
|------|----------------|
| `tests/health.test.ts` | `/api/health` returns 200 + correct shape (5 tests). |
| `tests/auth.test.ts` | Register → login → GET /api/user, duplicate email → 409, bad password → 401, no session → 401 (6 tests). |
| `tests/jobs.test.ts` | Recruiter creates + lists jobs, seeker can't create (403), recruiter can't edit other's job (403), seekers see only active jobs (5 tests). |
| `tests/resumes.test.ts` | Seeker uploads a fixture PDF → status transitions to `ready` → skills extracted (JavaScript, TypeScript, React, etc.) → experience-years heuristic fires. Recruiter can't upload (403). Non-PDF rejected (415) (3 tests). |
| `tests/matches.test.ts` | Seeker uploads + recruiter posts job → `GET /api/matches/resume/{id}` returns matches with `matchPercentage` + `source`. Privacy check: seeker can't fetch another's matches (403) (2 tests). |
| `tests/notifications.test.ts` | Register-device, list, markAsRead, unread-count, preferences GET/PUT, owner-scoped 404 (8 tests). |
| `tests/rate-limit.test.ts` | Upload 6 PDFs in a row → 6th returns 429 with `Retry-After` header (1 test). |

### Test architecture

- **Vitest + supertest-style** — route handlers are called directly with
  `new Request(...)`; no dev server required.
- **Isolated test DB** — `tests/setup.ts` sets `DATABASE_URL` to a temp
  SQLite file, runs `prisma db push` to create the schema, and wipes all
  tables between tests.
- **Mocked auth** — `next-auth#getServerSession` is mocked per-test via
  `tests/helpers.ts#loginAs(user)`. No real NextAuth callback flow.
- **Mocked `after()`** — `next/server#after` is mocked to collect promises
  into a queue. `waitForBackgroundWork()` drains them deterministically.
  Promises are serialized to avoid SQLite concurrent-write contention.
- **Fixture PDF** — `tests/fixtures/generate-pdf.ts` uses `pdf-lib` to
  generate a tiny valid PDF with a sample resume. The resumes + matches
  tests auto-generate the fixture if it's missing.

---

## 14. Known Limitations & Roadmap

### v1 limitations (intentional scope)

- **English-only.** The skills dictionary, AI prompts, and notification
  templates are English-only. Multilingual support is on the roadmap
  (next-intl is already installed).
- **OCR out of scope.** `pdf-parse` extracts text from text-based PDFs
  only. Scanned image PDFs (no text layer) → `status='failed'` with a
  clear `parseError`. Tesseract integration is on the roadmap.
- **Real FCM + SMTP need configuration.** Both gracefully no-op in the
  sandbox. The notification center + bell work end-to-end (rows persist
  regardless of delivery channel).
- **Daily digest needs cron.** `sendDailyDigest()` is implemented + tested
  but not scheduled. The README documents the curl command + admin secret.
- **No websocket/SSE push for foreground notifications.** The bell polls
  `/api/notifications/unread-count` every 30s. A socket.io channel would
  be lower-latency (the `examples/` folder has a demo).
- **In-memory cache + rate limiter are single-process.** Multi-instance
  deployments MUST swap in Redis (interface-compatible — see
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

### Roadmap

- Multilingual UI (next-intl) + localized skills dictionary.
- OCR fallback for scanned PDFs (Tesseract via `node-tesseract-ocr`).
- Real-time notifications via socket.io (replace polling).
- Per-user timezone for daily digest staggering.
- CSRF tokens for state-changing JSON endpoints (NextAuth's CSRF covers
  form posts only).
- Resume-builder collaborative editing (Yjs / Liveblocks).
- Recruiter-side saved-search alerts (per-query notification
  subscriptions).

---

## 15. Contributing / License

This is a portfolio reference implementation. PRs are welcome — please
open an issue first to discuss the change.

- **Lint:** `bun run lint` (ESLint with `eslint-config-next`).
- **Tests:** `bun run test` (must pass before merge).
- **Schema changes:** edit `prisma/schema.prisma`, run `bun run db:push`,
  commit the updated `db/custom.db` (or a migration if you're using
  `prisma migrate`).

License: MIT (see `LICENSE` if present, otherwise treat as MIT-style
permissive).
