# Resume Matchmaker — Laravel API

REST API for Resume Matchmaker: resume parsing, AI matching, the resume builder, applications, messaging and notifications. Every endpoint lives under `/api/**` and returns `{ data }` or `{ error: { message, code } }`.

## Setup

Requires PHP 8.2+, Composer and MySQL 8.

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed        # schema, 8 resume templates, demo users, 100 jobs
php artisan serve                 # http://127.0.0.1:8000
php artisan queue:work            # required: parsing, matching and notifications run on the queue
```

For the scheduled daily digest, add `* * * * * php artisan schedule:run` to cron.

## Configuration

| Setting | Notes |
|---|---|
| `DB_*` | MySQL connection |
| `FILESYSTEM_DISK` | `local` for development, `s3` in production |
| `GROQ_API_KEY` | Optional. Enables AI; `AI_PROVIDER` can force `groq` or `huggingface` |
| `HUGGINGFACE_API_KEY` | Optional alternative AI provider |
| `FRONTEND_URL` | Next.js origin (default `http://localhost:3000`) |
| `FCM_*`, `MAIL_*` | Optional push and email; both no-op when unset |
| `ADMIN_SECRET` | Guards `POST /api/notifications/digest/run` |

Rate limits: 60 requests/min, 5 uploads/hour, 10 generations/hour.

## How it works

- **AI with a fallback.** Every AI call reports `source: ai | fallback`. With no key, or after 3 failed retries, skills come from a curated dictionary and matching uses TF-IDF similarity. Results are cached for 7 days. See [docs/AI_FALLBACK.md](docs/AI_FALLBACK.md).
- **Privacy.** Recruiters never see extracted resume text, only skills, experience and match data (`CandidateResource`). A candidate's email and resume file are shared only with a recruiter they applied to.
- **Resume builder.** 8 Blade templates rendered to HTML, PDF (dompdf) and DOCX (PhpWord), with sanitised theme customisation (colours, fonts, spacing, size). DOCX is content-accurate, layout-approximate.
- **Accounts.** `POST /api/users/export-data` exports all of a user's data; `DELETE /api/users/me` soft-deletes, and `php artisan users:purge-deleted` purges after 30 days.

## Tests

```bash
php artisan test
```

## Docs

- [API reference](docs/API.md)
- [Deployment](docs/DEPLOYMENT.md)

## License

MIT
