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

<details>
<summary><b>Show all screenshots</b> (28 screens, light and dark)</summary>

#### Public site

| Screen | Light | Dark |
|---|:---:|:---:|
| Landing page — animated hero with a live match preview | <img src="docs/screenshots/light/01-landing.png" alt="Landing page — animated hero with a live match preview (light)" /> | <img src="docs/screenshots/dark/01-landing.png" alt="Landing page — animated hero with a live match preview (dark)" /> |
| Feature overview | <img src="docs/screenshots/light/02-landing-features.png" alt="Feature overview (light)" /> | <img src="docs/screenshots/dark/02-landing-features.png" alt="Feature overview (dark)" /> |
| Sign in — split-screen layout with animated brand panel | <img src="docs/screenshots/light/03-login.png" alt="Sign in — split-screen layout with animated brand panel (light)" /> | <img src="docs/screenshots/dark/03-login.png" alt="Sign in — split-screen layout with animated brand panel (dark)" /> |
| Register — choose job seeker or recruiter | <img src="docs/screenshots/light/04-register.png" alt="Register — choose job seeker or recruiter (light)" /> | <img src="docs/screenshots/dark/04-register.png" alt="Register — choose job seeker or recruiter (dark)" /> |

#### Job seeker

| Screen | Light | Dark |
|---|:---:|:---:|
| Dashboard — animated stat counters, recent resumes and top matches | <img src="docs/screenshots/light/10-seeker-dashboard.png" alt="Dashboard — animated stat counters, recent resumes and top matches (light)" /> | <img src="docs/screenshots/dark/10-seeker-dashboard.png" alt="Dashboard — animated stat counters, recent resumes and top matches (dark)" /> |
| Find jobs — search and filter by work mode, type and level, with a match score on every card | <img src="docs/screenshots/light/11-find-jobs.png" alt="Find jobs — search and filter by work mode, type and level, with a match score on every card (light)" /> | <img src="docs/screenshots/dark/11-find-jobs.png" alt="Find jobs — search and filter by work mode, type and level, with a match score on every card (dark)" /> |
| Job detail — your match %, matched skills and skills to learn, one-click apply | <img src="docs/screenshots/light/12-job-detail.png" alt="Job detail — your match %, matched skills and skills to learn, one-click apply (light)" /> | <img src="docs/screenshots/dark/12-job-detail.png" alt="Job detail — your match %, matched skills and skills to learn, one-click apply (dark)" /> |
| My matches — sortable table with a minimum-match filter | <img src="docs/screenshots/light/13-matches.png" alt="My matches — sortable table with a minimum-match filter (light)" /> | <img src="docs/screenshots/dark/13-matches.png" alt="My matches — sortable table with a minimum-match filter (dark)" /> |
| Applications — track every application's status | <img src="docs/screenshots/light/14-applications.png" alt="Applications — track every application's status (light)" /> | <img src="docs/screenshots/dark/14-applications.png" alt="Applications — track every application's status (dark)" /> |
| My resumes — upload PDFs and watch parsing status | <img src="docs/screenshots/light/15-my-resumes.png" alt="My resumes — upload PDFs and watch parsing status (light)" /> | <img src="docs/screenshots/dark/15-my-resumes.png" alt="My resumes — upload PDFs and watch parsing status (dark)" /> |
| Resume analysis — AI-extracted skills grouped by category | <img src="docs/screenshots/light/16-resume-analysis.png" alt="Resume analysis — AI-extracted skills grouped by category (light)" /> | <img src="docs/screenshots/dark/16-resume-analysis.png" alt="Resume analysis — AI-extracted skills grouped by category (dark)" /> |
| Resume builder — all generated resumes | <img src="docs/screenshots/light/17-resume-builder.png" alt="Resume builder — all generated resumes (light)" /> | <img src="docs/screenshots/dark/17-resume-builder.png" alt="Resume builder — all generated resumes (dark)" /> |
| Template gallery — themed resume templates | <img src="docs/screenshots/light/18-template-gallery.png" alt="Template gallery — themed resume templates (light)" /> | <img src="docs/screenshots/dark/18-template-gallery.png" alt="Template gallery — themed resume templates (dark)" /> |
| Resume editor — form editing with a live preview, AI tailor and export | <img src="docs/screenshots/light/19-resume-editor.png" alt="Resume editor — form editing with a live preview, AI tailor and export (light)" /> | <img src="docs/screenshots/dark/19-resume-editor.png" alt="Resume editor — form editing with a live preview, AI tailor and export (dark)" /> |
| Full-page resume preview | <img src="docs/screenshots/light/20-resume-preview.png" alt="Full-page resume preview (light)" /> | <img src="docs/screenshots/dark/20-resume-preview.png" alt="Full-page resume preview (dark)" /> |
| Version history | <img src="docs/screenshots/light/21-version-history.png" alt="Version history (light)" /> | <img src="docs/screenshots/dark/21-version-history.png" alt="Version history (dark)" /> |
| Messages — chat with recruiters | <img src="docs/screenshots/light/22-messages.png" alt="Messages — chat with recruiters (light)" /> | <img src="docs/screenshots/dark/22-messages.png" alt="Messages — chat with recruiters (dark)" /> |
| Notifications | <img src="docs/screenshots/light/23-notifications.png" alt="Notifications (light)" /> | <img src="docs/screenshots/dark/23-notifications.png" alt="Notifications (dark)" /> |
| Settings — profile, notification preferences, data export | <img src="docs/screenshots/light/24-settings.png" alt="Settings — profile, notification preferences, data export (light)" /> | <img src="docs/screenshots/dark/24-settings.png" alt="Settings — profile, notification preferences, data export (dark)" /> |

#### Recruiter

| Screen | Light | Dark |
|---|:---:|:---:|
| Recruiter dashboard — hiring pipeline at a glance | <img src="docs/screenshots/light/30-recruiter-dashboard.png" alt="Recruiter dashboard — hiring pipeline at a glance (light)" /> | <img src="docs/screenshots/dark/30-recruiter-dashboard.png" alt="Recruiter dashboard — hiring pipeline at a glance (dark)" /> |
| My jobs | <img src="docs/screenshots/light/31-recruiter-jobs.png" alt="My jobs (light)" /> | <img src="docs/screenshots/dark/31-recruiter-jobs.png" alt="My jobs (dark)" /> |
| Job detail — ranked matched candidates with matched/missing skills | <img src="docs/screenshots/light/32-recruiter-job-candidates.png" alt="Job detail — ranked matched candidates with matched/missing skills (light)" /> | <img src="docs/screenshots/dark/32-recruiter-job-candidates.png" alt="Job detail — ranked matched candidates with matched/missing skills (dark)" /> |
| Post a job | <img src="docs/screenshots/light/33-post-job.png" alt="Post a job (light)" /> | <img src="docs/screenshots/dark/33-post-job.png" alt="Post a job (dark)" /> |
| Applicants — review and update application status | <img src="docs/screenshots/light/34-applicants.png" alt="Applicants — review and update application status (light)" /> | <img src="docs/screenshots/dark/34-applicants.png" alt="Applicants — review and update application status (dark)" /> |
| Candidates — search every matched candidate across jobs | <img src="docs/screenshots/light/35-candidates.png" alt="Candidates — search every matched candidate across jobs (light)" /> | <img src="docs/screenshots/dark/35-candidates.png" alt="Candidates — search every matched candidate across jobs (dark)" /> |
| Recruiter messaging | <img src="docs/screenshots/light/36-recruiter-messages.png" alt="Recruiter messaging (light)" /> | <img src="docs/screenshots/dark/36-recruiter-messages.png" alt="Recruiter messaging (dark)" /> |

#### Mobile

| Screen | Light | Dark |
|---|:---:|:---:|
| Landing page on a phone | <img src="docs/screenshots/light/05-mobile-landing.png" alt="Landing page on a phone (light)" width="220" /> | <img src="docs/screenshots/dark/05-mobile-landing.png" alt="Landing page on a phone (dark)" width="220" /> |
| Dashboard on a phone | <img src="docs/screenshots/light/25-mobile-dashboard.png" alt="Dashboard on a phone (light)" width="220" /> | <img src="docs/screenshots/dark/25-mobile-dashboard.png" alt="Dashboard on a phone (dark)" width="220" /> |

</details>

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
