# Resume Matchmaker

AI-powered resume ↔ job matching. Job seekers upload a PDF resume and get a match score for every open job; recruiters post jobs and get ranked candidates.

```
backend-laravel/    Laravel 11 REST API (PHP 8.2+, MySQL, Sanctum)
frontend-nextjs/    Next.js 16 client (TypeScript, Tailwind, shadcn/ui)
```

## Features

| | Job seekers | Recruiters |
|---|---|---|
| 🧠 **AI parsing** | Skills and experience extracted from PDF resumes (Groq / Hugging Face, dictionary fallback) | Structured candidate profiles, never raw resume text |
| 🎯 **Matching** | 0–100% fit for every job, with matched and missing skills | Candidates ranked per job |
| 📝 **Resume builder** | 8 themed templates, live preview, AI enhance and tailor, versions, PDF/DOCX/HTML export | — |
| 📨 **Applications** | Apply with any resume and track status | Review applicants and move them through a pipeline |
| 💬 **Messaging** | Chat with recruiters | Contact matched candidates |
| 🔔 **Notifications** | Matches, messages, application updates | New applicants and matches |

Light and dark themes, responsive down to phone width.

## Screenshots

| | |
|:---:|:---:|
| <img src="docs/screenshots/light/01-landing.png" alt="Landing page" /> | <img src="docs/screenshots/light/11-find-jobs.png" alt="Find jobs with match scores" /> |
| Landing | Find jobs |
| <img src="docs/screenshots/light/12-job-detail.png" alt="Job detail and apply" /> | <img src="docs/screenshots/light/19-resume-editor.png" alt="Resume editor with live preview" /> |
| Job detail & apply | Resume editor |
| <img src="docs/screenshots/light/18-template-gallery.png" alt="Template gallery" /> | <img src="docs/screenshots/light/32-recruiter-job-candidates.png" alt="Ranked candidates for a job" /> |
| Template gallery | Ranked candidates |
| <img src="docs/screenshots/light/34-applicants.png" alt="Applicant pipeline" /> | <img src="docs/screenshots/dark/22-messages.png" alt="Messages (dark mode)" /> |
| Applicant pipeline | Messages (dark) |

Every screen in light and dark mode: [`docs/screenshots/`](docs/screenshots).

## Quick start

Requires PHP 8.2+, Composer, MySQL 8 and Node.js 20+.

```bash
# Backend — http://localhost:8000
cd backend-laravel
composer install
cp .env.example .env && php artisan key:generate
# set DB_*, FILESYSTEM_DISK=local, and optionally GROQ_API_KEY
php artisan migrate --seed
php artisan serve
php artisan queue:work          # separate terminal: parsing, matching, notifications

# Frontend — http://localhost:3000
cd frontend-nextjs
npm install
cp .env.example .env            # set NEXTAUTH_SECRET; LARAVEL_API_URL defaults to :8000
npm run dev
```

Without an AI key everything still works on the deterministic fallback (skill dictionary + TF-IDF).

**Demo accounts** (created when `APP_ENV=local`, password `password123`): `seeker@example.com`, `recruiter@example.com`. The seeder also adds 100 sample jobs.

## Tests

```bash
cd backend-laravel && php artisan test     # PHPUnit feature + unit tests
cd frontend-nextjs && npm test             # Vitest
```

## More

- [Backend README](backend-laravel/README.md): configuration, AI fallback, privacy
- [API reference](backend-laravel/docs/API.md) · [Deployment](backend-laravel/docs/DEPLOYMENT.md)
- [Frontend README](frontend-nextjs/README.md)

## License

MIT
