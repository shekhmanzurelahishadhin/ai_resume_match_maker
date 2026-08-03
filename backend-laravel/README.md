# Resume Matchmaker — Laravel 12 Backend

> REST API backend for **Resume Matchmaker**. Job seekers upload PDF resumes,
> AI extracts their skills, and the system matches them against recruiter job
> posts. Built with Laravel 12, PHP 8.3, MySQL 8, Redis 7, and the Hugging
> Face Inference API (with explicit dictionary + TF-IDF fallbacks).

This Laravel backend pairs with the existing Next.js 16 frontend in the
parent directory. Every endpoint from §9 of the spec is mirrored 1:1 under
`/api/**` so the Next.js client can target either backend interchangeably.

---

## 1. Requirements

- **PHP** 8.3+
- **Composer** 2.7+
- **MySQL** 8.0+
- **Redis** 7.2+
- **Node.js** 20+ (only if you build the optional Vite assets)

---

## 2. Install

```bash
cd backend-laravel

# PHP dependencies
composer install

# Environment
cp .env.example .env
php artisan key:generate

# Edit .env:
#   DB_*, REDIS_*, FILESYSTEM_DISK (use "local" for dev),
#   HUGGINGFACE_API_KEY (optional — empty = dictionary fallback),
#   ADMIN_SECRET (required for /api/notifications/digest/run)
```

---

## 3. Database

```bash
# Create the MySQL database (one-time)
mysql -u root -p -e "CREATE DATABASE resumematchmaker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run all migrations (16 tables: users, resumes, job_posts, matches,
# resume_templates, generated_resumes, resume_versions, resume_improvements,
# device_tokens, notifications, notification_preferences, ai_caches,
# rate_limit_buckets, jobs, failed_jobs, + soft deletes on users)
php artisan migrate

# Seed the 6 resume templates (modern-clean, professional-classic, creative,
# executive, technical, academic)
php artisan db:seed
# or specifically:
php artisan templates:seed
```

---

## 4. Serve

```bash
php artisan serve            # http://127.0.0.1:8000
```

For local development against the Next.js frontend (port 3000), set
`FRONTEND_URL=http://localhost:3000` and `SANCTUM_STATEFUL_DOMAINS=localhost:3000`
in `.env`. CORS is configured in `config/cors.php`.

---

## 5. Queue worker

Resume parsing + matching + push notifications all run on the **database**
queue driver. Start a worker in a separate terminal:

```bash
php artisan queue:work --tries=3 --backoff=2,4,8
```

The daily digest is scheduled at 09:00 via Laravel's scheduler:

```bash
# Add to the system crontab:
* * * * * cd /path/to/backend-laravel && php artisan schedule:run >> /dev/null 2>&1
```

---

## 6. Configuration overview

| Concern | Config file | Notes |
|---------|-------------|-------|
| Rate limits (§8) | `config/rate-limit.php` + `app/Providers/AppServiceProvider.php` | 60/min API, 5/hr uploads, 10/hr generations. |
| Hugging Face models | `config/huggingface.php` | NER + cross-encoder + zero-shot + text-gen model IDs. |
| Firebase FCM | `config/firebase.php` | Graceful no-op when env missing. |
| Filesystem | `config/filesystems.php` | `s3` default; `local` for dev. |
| Cache | `config/cache.php` | `redis` default; `file` fallback. |
| Queue | `config/queue.php` | `database` default. |
| Sanctum | `config/sanctum.php` (publishable) | Token + cookie auth. |

---

## 7. AI integration & fallback

Every AI call returns `{ result, source: 'ai' | 'fallback' }`. When
`HUGGINGFACE_API_KEY` is empty (or HF is unreachable after 3 retries with
exponential backoff: 2s, 4s, 8s), the service degrades to:

| Operation | Fallback |
|-----------|----------|
| Skill extraction | Curated 230+ skill dictionary (`app/Services/SkillsDictionary.php`) |
| Resume↔Job matching | TF-IDF cosine similarity over extracted text |
| Skill categorization | Static lookup table from the dictionary |
| Resume tailoring | Template-based bullet rewriting using extracted skills + job description |
| Resume enhancement | Rule-based grammar + style fixes (capitalization, action verbs) |

See [docs/AI_FALLBACK.md](docs/AI_FALLBACK.md) for the full design.

Match results are cached for 7 days in the `ai_caches` table, keyed on
`md5(resumeText + "\0" + jobText)`.

---

## 8. Privacy (§5)

- **Seekers own their resumes.** The `extracted_text` column is *never*
  exposed to recruiters. Recruiter-facing endpoints
  (`/api/jobs/{id}/candidates`, `/api/matches/job/{jobId}`) return only
  `skills`, `experience_years`, `matched_skills`, `missing_skills`, and
  `match_percentage` — see `app/Http/Resources/CandidateResource.php`.
- **Notifications + device tokens are owner-scoped.** Cross-user access
  returns 404 (no enumeration).
- **GDPR export:** `POST /api/users/export-data` returns a JSON document
  with all of the user's data.
- **Account deletion:** `DELETE /api/users/me` soft-deletes the user (30-day
  retention); `php artisan users:purge-deleted` hard-purges expired rows.

---

## 9. Resume generation (§6)

6 templates, each rendered to HTML (Blade), PDF (laravel-dompdf), and DOCX
(phpword). DOCX is **content-accurate, layout-approximate** — the conversion
preserves all text + structure (headings, lists, tables) but visual fidelity
(colors, fonts, spacing) is approximate. Recruiters who need pixel-perfect
rendering should request PDF. The export endpoint returns
`{ docx_caveat: "content-accurate, layout-approximate" }` in the response.

| Slug | Style |
|------|-------|
| `modern-clean` | Sans-serif, generous whitespace, emerald accent |
| `professional-classic` | Serif, conservative, traditional |
| `creative` | Colorful, asymmetric, sidebar layout |
| `executive` | Two-column, serif, dense |
| `technical` | Skills-forward, monospace accents |
| `academic` | Citation-friendly, minimal |

---

## 10. Notifications (§7)

- **In-app:** always on — every notification persists to the `notifications` table.
- **Push (FCM):** when `FCM_*` env vars are set, every active `device_token`
  for the user receives a push via `kreait/firebase-php`. Falls back silently.
- **Email:** Laravel's `mail` over SMTP. Falls back to `log` mailer when
  `MAIL_HOST` is empty.
- **Daily digest:** scheduled at 09:00, compiles last-24h notifications +
  unread count per user (gated by `dailyDigest=true AND emailNotifications=true`).

---

## 11. Testing

```bash
php artisan test
# or
./vendor/bin/phpunit
```

The suite uses `RefreshDatabase` + an in-memory SQLite database for speed
(see `phpunit.xml`). Feature tests cover auth, resume upload, jobs, matches,
generated resumes, notifications, health, and rate limits. Unit tests cover
the `HuggingFaceService`, `MatchService`, and `SkillsDictionary`.

---

## 12. Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full production recipe
(MySQL, Redis, S3/MinIO, FCM, supervisor-managed queue workers, cron
scheduler).

---

## 13. API reference

See [docs/API.md](docs/API.md) for every endpoint with example
request/response shapes.

---

## 14. License

MIT.
