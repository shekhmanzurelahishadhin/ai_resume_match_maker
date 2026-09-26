# Resume Matchmaker — Full Project (Laravel 12 + Next.js 16)

> AI-powered resume ↔ job matching platform. Job seekers upload PDF resumes
> and get compatibility scores against job descriptions. Recruiters post jobs
> and get ranked, scored candidate lists.

This repository contains BOTH halves of the production system:

```
.
├── backend-laravel/        # Laravel 12 + PHP 8.3 REST API
└── frontend-nextjs/        # Next.js 16 + TypeScript frontend (this folder is the standalone frontend variant)
```

> ℹ️ The Next.js app at the **repository root** (`/home/z/my-project/`) is the
> fullstack adaptation used for the live demo sandbox — it has API routes
> baked in so it runs without a separate Laravel backend. The
> `frontend-nextjs/` folder is the same Next.js code packaged for production
> use against the Laravel API. See **§3 Frontend deployment** below.

---

## ✨ Features

| | Job seekers | Recruiters |
|---|---|---|
| 🧠 **AI parsing** | Upload a PDF resume; skills, experience and seniority are extracted (Groq / Hugging Face, with a dictionary fallback) | See structured candidate profiles — never raw resume text |
| 🎯 **Match scoring** | 0–100% fit score for every open job, with matched and missing skills | Candidates ranked by match % for each job |
| 📝 **Resume builder** | Themed templates, live preview, AI enhance and tailor-to-job, version history, PDF/DOCX export | — |
| 📨 **Applications** | Apply in one click and track status | Review applicants and move them through the pipeline |
| 💬 **Messaging** | Chat with recruiters | Contact top candidates directly |
| 🔔 **Notifications** | New matches, messages and daily digests (in-app, push, email) | New applicants and candidate matches |
| 🌗 **Modern UI** | Light and dark mode, animated transitions, responsive down to phone width | Same |

### UI and UX

- **Light and dark themes**: follows the system theme by default, with an animated sun/moon toggle in the header, sidebar and auth pages.
- **Motion**: page transitions between dashboard routes, staggered card entrances, count-up stat numbers, a spring-animated active pill in the sidebar, hover lift on cards, and animated gradients and blobs on the landing and auth pages.
- **Accessibility**: every animation respects `prefers-reduced-motion`.
- **Responsive**: sticky frosted-glass headers, a drawer sidebar on mobile, and a two-column stat grid on phones.

## 📸 Screenshots

Every screen is shown in **light** and **dark** mode. The images live in [`docs/screenshots/`](docs/screenshots).

### Public site

**Landing page — animated hero with a live match preview**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/01-landing.png" alt="Landing page — animated hero with a live match preview (light)" /> | <img src="docs/screenshots/dark/01-landing.png" alt="Landing page — animated hero with a live match preview (dark)" /> |

**Feature overview**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/02-landing-features.png" alt="Feature overview (light)" /> | <img src="docs/screenshots/dark/02-landing-features.png" alt="Feature overview (dark)" /> |

**Sign in — split-screen layout with animated brand panel**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/03-login.png" alt="Sign in — split-screen layout with animated brand panel (light)" /> | <img src="docs/screenshots/dark/03-login.png" alt="Sign in — split-screen layout with animated brand panel (dark)" /> |

**Register — choose job seeker or recruiter**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/04-register.png" alt="Register — choose job seeker or recruiter (light)" /> | <img src="docs/screenshots/dark/04-register.png" alt="Register — choose job seeker or recruiter (dark)" /> |

### Job seeker

**Dashboard — animated stat counters, recent resumes and top matches**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/10-seeker-dashboard.png" alt="Dashboard — animated stat counters, recent resumes and top matches (light)" /> | <img src="docs/screenshots/dark/10-seeker-dashboard.png" alt="Dashboard — animated stat counters, recent resumes and top matches (dark)" /> |

**Find jobs — search and filter by work mode, type and level, with a match score on every card**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/11-find-jobs.png" alt="Find jobs — search and filter by work mode, type and level, with a match score on every card (light)" /> | <img src="docs/screenshots/dark/11-find-jobs.png" alt="Find jobs — search and filter by work mode, type and level, with a match score on every card (dark)" /> |

**Job detail — your match %, matched skills and skills to learn, one-click apply**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/12-job-detail.png" alt="Job detail — your match %, matched skills and skills to learn, one-click apply (light)" /> | <img src="docs/screenshots/dark/12-job-detail.png" alt="Job detail — your match %, matched skills and skills to learn, one-click apply (dark)" /> |

**My matches — sortable table with a minimum-match filter**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/13-matches.png" alt="My matches — sortable table with a minimum-match filter (light)" /> | <img src="docs/screenshots/dark/13-matches.png" alt="My matches — sortable table with a minimum-match filter (dark)" /> |

**Applications — track every application's status**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/14-applications.png" alt="Applications — track every application's status (light)" /> | <img src="docs/screenshots/dark/14-applications.png" alt="Applications — track every application's status (dark)" /> |

**My resumes — upload PDFs and watch parsing status**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/15-my-resumes.png" alt="My resumes — upload PDFs and watch parsing status (light)" /> | <img src="docs/screenshots/dark/15-my-resumes.png" alt="My resumes — upload PDFs and watch parsing status (dark)" /> |

**Resume analysis — AI-extracted skills grouped by category**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/16-resume-analysis.png" alt="Resume analysis — AI-extracted skills grouped by category (light)" /> | <img src="docs/screenshots/dark/16-resume-analysis.png" alt="Resume analysis — AI-extracted skills grouped by category (dark)" /> |

**Resume builder — all generated resumes**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/17-resume-builder.png" alt="Resume builder — all generated resumes (light)" /> | <img src="docs/screenshots/dark/17-resume-builder.png" alt="Resume builder — all generated resumes (dark)" /> |

**Template gallery — themed resume templates**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/18-template-gallery.png" alt="Template gallery — themed resume templates (light)" /> | <img src="docs/screenshots/dark/18-template-gallery.png" alt="Template gallery — themed resume templates (dark)" /> |

**Resume editor — form editing with a live preview, AI tailor and export**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/19-resume-editor.png" alt="Resume editor — form editing with a live preview, AI tailor and export (light)" /> | <img src="docs/screenshots/dark/19-resume-editor.png" alt="Resume editor — form editing with a live preview, AI tailor and export (dark)" /> |

**Full-page resume preview**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/20-resume-preview.png" alt="Full-page resume preview (light)" /> | <img src="docs/screenshots/dark/20-resume-preview.png" alt="Full-page resume preview (dark)" /> |

**Version history**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/21-version-history.png" alt="Version history (light)" /> | <img src="docs/screenshots/dark/21-version-history.png" alt="Version history (dark)" /> |

**Messages — chat with recruiters**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/22-messages.png" alt="Messages — chat with recruiters (light)" /> | <img src="docs/screenshots/dark/22-messages.png" alt="Messages — chat with recruiters (dark)" /> |

**Notifications**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/23-notifications.png" alt="Notifications (light)" /> | <img src="docs/screenshots/dark/23-notifications.png" alt="Notifications (dark)" /> |

**Settings — profile, notification preferences, data export**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/24-settings.png" alt="Settings — profile, notification preferences, data export (light)" /> | <img src="docs/screenshots/dark/24-settings.png" alt="Settings — profile, notification preferences, data export (dark)" /> |

### Recruiter

**Recruiter dashboard — hiring pipeline at a glance**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/30-recruiter-dashboard.png" alt="Recruiter dashboard — hiring pipeline at a glance (light)" /> | <img src="docs/screenshots/dark/30-recruiter-dashboard.png" alt="Recruiter dashboard — hiring pipeline at a glance (dark)" /> |

**My jobs**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/31-recruiter-jobs.png" alt="My jobs (light)" /> | <img src="docs/screenshots/dark/31-recruiter-jobs.png" alt="My jobs (dark)" /> |

**Job detail — ranked matched candidates with matched/missing skills**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/32-recruiter-job-candidates.png" alt="Job detail — ranked matched candidates with matched/missing skills (light)" /> | <img src="docs/screenshots/dark/32-recruiter-job-candidates.png" alt="Job detail — ranked matched candidates with matched/missing skills (dark)" /> |

**Post a job**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/33-post-job.png" alt="Post a job (light)" /> | <img src="docs/screenshots/dark/33-post-job.png" alt="Post a job (dark)" /> |

**Applicants — review and update application status**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/34-applicants.png" alt="Applicants — review and update application status (light)" /> | <img src="docs/screenshots/dark/34-applicants.png" alt="Applicants — review and update application status (dark)" /> |

**Candidates — search every matched candidate across jobs**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/35-candidates.png" alt="Candidates — search every matched candidate across jobs (light)" /> | <img src="docs/screenshots/dark/35-candidates.png" alt="Candidates — search every matched candidate across jobs (dark)" /> |

**Recruiter messaging**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/36-recruiter-messages.png" alt="Recruiter messaging (light)" /> | <img src="docs/screenshots/dark/36-recruiter-messages.png" alt="Recruiter messaging (dark)" /> |

### Mobile

**Landing page on a phone**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/05-mobile-landing.png" alt="Landing page on a phone (light)" width="260" /> | <img src="docs/screenshots/dark/05-mobile-landing.png" alt="Landing page on a phone (dark)" width="260" /> |

**Dashboard on a phone**

| Light | Dark |
|:---:|:---:|
| <img src="docs/screenshots/light/25-mobile-dashboard.png" alt="Dashboard on a phone (light)" width="260" /> | <img src="docs/screenshots/dark/25-mobile-dashboard.png" alt="Dashboard on a phone (dark)" width="260" /> |

### Demo accounts (local seed)

`php artisan db:seed` creates these accounts in a `local` environment:

| Role | Email | Password |
|---|---|---|
| Job seeker | `seeker@example.com` | `password123` |
| Recruiter | `recruiter@example.com` | `password123` |

### Regenerating screenshots

The screenshots were taken at 1440×900 (desktop) and 390×844 @2x (mobile) using headless Chrome against a local dev server with the seeded data. Contact details on the sample resume were replaced with placeholder data before capture.

---

## 1. Architecture

| Layer | Backend (Laravel) | Frontend (Next.js) |
|---|---|---|
| Language | PHP 8.3 | TypeScript 5 |
| Framework | Laravel 12 | Next.js 16 (App Router) |
| API | REST under `/api/**` (Sanctum auth) | Consumes via `fetch()` |
| DB | MySQL 8.0 (Prisma schema mirrored in migrations) | — |
| Cache | Redis 7.2 | — |
| Queue | Database driver | — |
| File storage | S3 / MinIO | — |
| AI | Hugging Face Inference API (with fallback) | — |
| Notifications | Firebase Cloud Messaging + email | Service worker + UI |
| Tests | PHPUnit 11 (8 feature + 3 unit) | Vitest (7 files, 30 tests) |
| Auth | Sanctum (bearer token or session cookie) | NextAuth adapter |

### Original spec compliance

Every endpoint from §9 of the spec is implemented in BOTH halves — they
share identical `/api/**` URLs and the same `{ data?, error? }` JSON envelope,
so the frontend can swap backends transparently.

| Spec § | Feature | Backend | Frontend |
|---|---|---|---|
| §3 | AI integration with fallback table | `app/Services/HuggingFaceService.php` | `src/lib/ai/huggingface.ts` |
| §4 | Database schema (11 models) | `database/migrations/*` | `prisma/schema.prisma` |
| §5 | Privacy & retention (GDPR export/delete) | `UserController@exportData/destroy` | `/api/users/export-data`, `/api/users/me` |
| §6 | Resume generation (6 templates, HTML/PDF/DOCX) | `app/Services/ResumeTemplateRenderer.php` | `src/lib/resume-templates/` |
| §7 | Push notifications (FCM + email fallback) | `app/Services/FirebaseService.php`, `app/Services/NotificationService.php` | `src/lib/notifications/` |
| §8 | Rate limiting (60/min, 5/hr upload, 10/hr generation) | `app/Http/Middleware/*`, `app/Providers/AppServiceProvider.php` | `src/lib/rate-limit.ts` |
| §9 | API endpoints (all phases) | `routes/api.php` | `src/app/api/**` |
| §10 | Security (MIME validation, XSS sanitization) | Form Requests + Blade escaping | `src/lib/validators/*` |
| §11 | Performance (cache, pagination, eager-load) | Eloquent + Cache facade | TanStack Query + pagination |

---

## 2. Quick start

### Option A — Full stack (Laravel + Next.js, production-style)

```bash
# 1. Start the backend
cd backend-laravel
composer install
cp .env.example .env
php artisan key:generate
# Edit .env: DB_*, REDIS_*, FILESYSTEM_DISK, HUGGINGFACE_API_KEY, ADMIN_SECRET
php artisan migrate
php artisan db:seed --class=ResumeTemplateSeeder
php artisan serve                  # http://localhost:8000
php artisan queue:listen &         # background worker for parsing/matching/notifications
php artisan schedule:work &        # daily digest scheduler (or use system cron in prod)

# 2. Start the frontend (in another terminal)
cd ../frontend-nextjs
bun install                         # or npm install
cp .env.example .env
# Edit .env: NEXT_PUBLIC_API_URL=http://localhost:8000/api
bun run dev                         # http://localhost:3000
```

### Option B — Frontend-only sandbox (Next.js with built-in API)

The Next.js app at the repository root (`/home/z/my-project/`) ships with
the full API baked in via `src/app/api/**` route handlers + Prisma. Use it
for local demos, hackathons, or when you don't want to run two services:

```bash
bun install
bun run db:push
bun run db:seed-templates
bun run dev                         # http://localhost:3000 — auth, upload, match, generate, notifications all work
```

---

## 3. Frontend deployment (production against Laravel)

The `frontend-nextjs/` folder is the same Next.js codebase configured to
call the Laravel API. To switch from the baked-in API to Laravel:

1. Set `NEXT_PUBLIC_API_URL` to your Laravel API base URL (e.g. `https://api.yourdomain.com/api`)
2. (Optional) Remove or ignore `src/app/api/**` route handlers — they're no
   longer the source of truth
3. Replace the NextAuth `CredentialsProvider` config in `src/lib/auth.ts`
   to POST to `${NEXT_PUBLIC_API_URL}/login` and `${NEXT_PUBLIC_API_URL}/register`
   (the response shape is already compatible: `{ data: { user, token } }`)
4. Update `src/lib/api.ts`'s base URL to use `NEXT_PUBLIC_API_URL`

The Next.js API routes (`src/app/api/**`) remain as a fallback / for
testing — they can be safely deleted for production frontend-only builds.

---

## 4. Project structure — Laravel backend

```
backend-laravel/
├── app/
│   ├── Console/Commands/           # Artisan commands (digest, purge, seed)
│   ├── Enums/                      # UserRole, ResumeStatus, MatchSource
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/                # AuthController, ResumeController, JobController,
│   │   │   │                       # MatchController, TemplateController,
│   │   │   │                       # GeneratedResumeController, NotificationController,
│   │   │   │                       # UserController
│   │   │   ├── HealthController.php
│   │   │   ├── Controller.php
│   │   │   └── ApiResponse.php     # { data?, error? } envelope trait
│   │   ├── Middleware/             # EnsureRole, AdminSecret, RateLimitUploads,
│   │   │                           # RateLimitGenerations
│   │   ├── Requests/               # Form requests (validation)
│   │   │   ├── Auth/
│   │   │   ├── Resume/
│   │   │   ├── Job/
│   │   │   ├── GeneratedResume/
│   │   │   └── Notification/
│   │   └── Resources/              # API resources (JSON shaping)
│   │       ├── UserResource, ResumeResource, ResumeListResource,
│   │       │   JobResource, MatchResource, CandidateResource (privacy-safe),
│   │       │   TemplateResource, GeneratedResumeResource,
│   │       │   ResumeVersionResource, NotificationResource
│   ├── Jobs/                       # Queue jobs (database driver)
│   │   ├── ParseResumeAndMatch.php
│   │   ├── MatchResumeAgainstJobs.php
│   │   ├── SendPushNotification.php
│   │   ├── SendBatchNotifications.php
│   │   ├── ProcessNotificationQueue.php
│   │   └── SendDailyDigest.php
│   ├── Models/                     # 13 Eloquent models
│   ├── Notifications/              # 5 Laravel notification classes (email fallback)
│   ├── Policies/                   # 5 authorization policies
│   ├── Providers/                  # App, Auth, Event, Route service providers
│   └── Services/                   # Business logic (framework-agnostic)
│       ├── HuggingFaceService.php  # AI + fallback (§3)
│       ├── SkillsDictionary.php    # 200+ skills for fallback
│       ├── MatchService.php        # scoring (70/30 semantic + skills)
│       ├── PdfParserService.php    # smalot/pdfparser
│       ├── ResumeTemplateRenderer.php  # HTML (Blade) + PDF (dompdf) + DOCX (phpword)
│       ├── StorageService.php      # S3 abstraction
│       ├── CacheService.php        # Redis abstraction
│       ├── NotificationService.php # Notification record + push dispatch
│       ├── FirebaseService.php     # FCM (kreait/firebase-php)
│       └── RateLimitService.php
├── bootstrap/
│   ├── app.php                     # Laravel 12 bootstrap
│   └── providers.php
├── config/                         # 15 config files (app, auth, cache, database,
│                                   # filesystems, queue, services, session, cors,
│                                   # logging, mail, hashing, rate-limit, huggingface,
│                                   # firebase, etc.)
├── database/
│   ├── factories/                  # 4 model factories
│   ├── migrations/                 # 16 migrations
│   └── seeders/                    # DatabaseSeeder + ResumeTemplateSeeder
├── docs/
│   ├── API.md                      # Full API reference
│   ├── DEPLOYMENT.md               # Production deployment guide
│   └── AI_FALLBACK.md              # §3 fallback design
├── public/
│   ├── index.php                   # Laravel front controller
│   ├── .htaccess
│   ├── firebase-messaging-sw.js    # FCM service worker
│   ├── sw.js                       # Generic service worker
│   ├── robots.txt
│   └── favicon.ico
├── resources/views/
│   ├── emails/                     # 5 Blade email templates
│   ├── resume-templates/           # 6 Blade resume templates
│   ├── layouts/resume.blade.php    # Shared layout for the 6 templates
│   └── welcome.blade.php
├── routes/
│   ├── api.php                     # ALL §9 endpoints
│   ├── web.php                     # health check + welcome
│   └── console.php                 # daily digest schedule
├── storage/                        # Framework-managed (with .gitkeep)
│   ├── app/public/
│   ├── framework/{cache,sessions,views,testing}/
│   └── logs/
├── tests/
│   ├── Feature/                    # 8 PHPUnit feature tests
│   └── Unit/                       # 3 PHPUnit unit tests
├── .env.example
├── .gitignore
├── artisan
├── composer.json
├── phpunit.xml
├── package.json                    # Vite + Tailwind (Laravel defaults)
├── vite.config.js
└── README.md
```

---

## 5. Project structure — Next.js frontend

```
frontend-nextjs/
├── prisma/schema.prisma             # 11 models (mirror of Laravel migrations)
├── src/
│   ├── app/
│   │   ├── api/                     # 30+ route handlers (fullstack fallback)
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── register/, login/, logout/, user/, forgot-password/, reset-password/
│   │   │   ├── resumes/
│   │   │   │   ├── upload/, route.ts, [id]/{status,matches,analyze,route}.ts
│   │   │   │   └── generate/        # Phase 2 (template, export, enhance, tailor, versions)
│   │   │   ├── jobs/, jobs/[id]/{candidates,...}
│   │   │   ├── matches/{[id],resume/[id],job/[id]}
│   │   │   ├── templates/, templates/[slug]
│   │   │   ├── notifications/       # Phase 3 (register-device, preferences, etc.)
│   │   │   ├── users/{export-data,me}
│   │   │   └── health/
│   │   ├── login/, register/
│   │   ├── dashboard/
│   │   │   ├── layout.tsx           # Role-aware sidebar
│   │   │   ├── page.tsx             # Overview (stats + recent)
│   │   │   ├── seeker/{resumes,resumes/[id],matches}
│   │   │   ├── recruiter/{jobs,jobs/new,jobs/[id],candidates}
│   │   │   ├── resumes/generate/{new,[id]/edit,[id]/preview,[id]/versions}
│   │   │   ├── notifications/, settings/
│   │   │   └── ...
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                 # Landing
│   ├── components/
│   │   ├── ui/                      # shadcn/ui (44 components)
│   │   ├── providers.tsx            # NextAuth SessionProvider + Theme
│   │   ├── app-sidebar.tsx          # Role-aware nav
│   │   ├── resume-upload.tsx, resume-card.tsx, resume-status-badge.tsx
│   │   ├── match-card.tsx, ai-source-badge.tsx
│   │   ├── job-form.tsx, job-card.tsx, candidate-list.tsx
│   │   ├── resume-builder/          # template-picker, resume-form, resume-preview,
│   │   │                            # experience-editor, skills-editor, export-dialog,
│   │   │                            # enhance-button, version-history, tailor-dialog
│   │   ├── notifications/           # notification-bell
│   │   ├── skill-badge.tsx, stat-card.tsx, empty-state.tsx
│   ├── hooks/                       # use-mobile, use-toast
│   └── lib/
│       ├── db.ts                    # Prisma client
│       ├── auth.ts                  # NextAuth config (Credentials + JWT)
│       ├── api.ts                   # ok()/err()/getCurrentUser() helpers
│       ├── storage.ts               # StorageService (S3-ready)
│       ├── cache.ts                 # CacheService (Redis-ready)
│       ├── rate-limit.ts            # §8 rate limiter
│       ├── resume-parser.ts         # unpdf-based PDF text extraction
│       ├── constants.ts, utils.ts
│       ├── validators/              # zod schemas (auth, resume, job, notification)
│       ├── ai/
│       │   ├── huggingface.ts       # HF Inference + retry + cache + fallback
│       │   ├── skills.ts            # 230+ curated skills
│       │   └── matcher.ts           # MatchService (scoring + Match creation)
│       ├── notifications/
│       │   ├── fcm.ts               # FirebaseNotificationService
│       │   ├── email.ts             # nodemailer fallback
│       │   ├── service.ts           # NotificationService
│       │   ├── triggers.ts          # event hooks
│       │   ├── daily-digest.ts
│       │   └── client.ts            # browser-side FCM token + permission
│       └── resume-templates/
│           ├── shared/partials.hbs
│           ├── render.ts, export-pdf.ts, export-docx.ts
│           ├── modern-clean/{template.hbs, meta.ts}
│           ├── professional-classic/
│           ├── creative/
│           ├── executive/
│           ├── technical/
│           └── academic/
├── public/
│   ├── firebase-messaging-sw.js, sw.js
│   ├── logo.svg, robots.txt
├── tests/                           # 7 vitest files, 30 tests
├── Dockerfile, docker-compose.yml, docker-compose.dev.yml
├── package.json, tsconfig.json, tailwind.config.ts, next.config.ts
├── vitest.config.ts
├── .env.example
└── README.md
```

---

## 6. Testing

### Backend (Laravel)
```bash
cd backend-laravel
php artisan test                   # 11 tests (8 feature + 3 unit)
./vendor/bin/pint --test           # PHP CS Fixer lint
```

### Frontend (Next.js)
```bash
cd frontend-nextjs
bun run lint                       # ESLint — 0 errors
bun run test                       # 30 vitest tests across 7 files
```

---

## 7. Production deployment

See `backend-laravel/docs/DEPLOYMENT.md` for the full guide. TL;DR:

1. **Backend**: deploy Laravel to a PHP-FPM server (Forge/Vapor/Sail/etc.),
   set up MySQL 8, Redis 7, S3 storage, run `php artisan migrate --force`,
   seed templates, configure Supervisor for the queue worker, add a cron
   entry for `php artisan schedule:run`.
2. **Frontend**: build `bun run build` and host the standalone Next.js
   server (Vercel/self-hosted). Point `NEXT_PUBLIC_API_URL` at the Laravel API.
3. **Firebase**: create a project, download the service account JSON,
   set `FIREBASE_CREDENTIALS` env var, configure VAPID key for web push.
4. **Cron**: `* * * * * cd /var/www/resumematchmaker/backend-laravel && php artisan schedule:run >> /dev/null 2>&1`
5. **Daily digest**: auto-fired by the scheduler at 09:00 server time via
   `SendDailyDigestCommand`. Manual trigger: `POST /api/notifications/digest/run`
   with `x-admin-secret` header.

---

## 8. Open decisions (resolved)

The spec's "Open decisions before starting Phase 1" have been resolved:

1. ✅ Laravel 12 / Next.js 16 feature set verified against live docs at build time
2. ✅ Hugging Face model availability: empty API key → all calls fall back to
   dictionary + TF-IDF. Set `HUGGINGFACE_API_KEY` to enable real AI.
3. ✅ English-only scope for v1 (multilingual needs separate models — documented)
4. ✅ Local dev uses local disk; production uses S3 (configurable via `FILESYSTEM_DISK`)

---

## License

MIT.
