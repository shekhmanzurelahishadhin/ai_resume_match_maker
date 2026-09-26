# Resume Matchmaker — Next.js frontend

Next.js 16 (App Router) client for the [Laravel API](../backend-laravel). It holds no data of its own: browser calls to `/api/**` go through a proxy route that attaches the user's Sanctum token server-side, so the token never reaches browser JavaScript.

**Stack:** TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query, NextAuth (JWT), react-hook-form + zod, Vitest.

## Setup

Start the Laravel API first (see the [root README](../README.md)), then:

```bash
npm install
cp .env.example .env
npm run dev                  # http://localhost:3000
```

| Variable | Notes |
|---|---|
| `LARAVEL_API_URL` | API base, default `http://localhost:8000/api` |
| `NEXTAUTH_SECRET` | Required. Generate with `openssl rand -base64 48` |
| `NEXTAUTH_URL` | Public URL of this app |
| `NEXT_PUBLIC_FIREBASE_*` | Optional web push |

AI keys belong in the backend's `.env`, not here.

## Scripts

| Command | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build, served from `.next/standalone` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

## Layout

```
src/app/api/[...path]/route.ts   proxy to Laravel (adds the bearer token)
src/app/dashboard/               seeker, recruiter, resume builder, messages, settings
src/components/                  feature components + shadcn/ui primitives
src/lib/                         API client, auth, validators, shared types
```

Docker files (`Dockerfile`, `docker-compose.yml`) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) cover production hosting.

## License

MIT
