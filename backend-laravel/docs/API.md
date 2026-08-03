# API Reference — Resume Matchmaker Laravel Backend

All endpoints are under `/api/**`. Authenticated endpoints require a
Sanctum bearer token (`Authorization: Bearer <token>`) or a session
cookie from the Next.js frontend (stateful via
`SANCTUM_STATEFUL_DOMAINS`).

Responses follow the `{ data?: ... }` envelope on success and
`{ error: { message, code, status, ... } }` on failure.

---

## Phase 1 — Auth + Resumes + Jobs + Matches

### POST /api/register
Create a seeker or recruiter.

```http
POST /api/register
Content-Type: application/json

{
  "name": "Alice Seeker",
  "email": "alice@example.com",
  "password": "super-secret-123",
  "role": "seeker"
}
```

**201 Created**
```json
{
  "data": {
    "user": { "id": "uuid", "name": "Alice Seeker", "email": "alice@example.com", "role": "seeker", "createdAt": "..." },
    "token": "1|abcdef..."
  }
}
```

**409 Conflict** — `EMAIL_TAKEN`. **422** — validation error.

---

### POST /api/login

```http
POST /api/login
Content-Type: application/json

{ "email": "alice@example.com", "password": "super-secret-123" }
```

**200 OK** — `{ "data": { "user": {...}, "token": "..." } }`.
**401** — `INVALID_CREDENTIALS`.

---

### POST /api/logout  *(auth)*
Revokes the current access token. **200 OK** — `{ "data": null }`.

---

### POST /api/forgot-password
**200** — always (no enumeration). In dev (no SMTP), the response includes
`devOnly: { token, expiresIn }` for testing.

---

### POST /api/reset-password
Body: `{ token, email, password }`. **200** on success, **400** `RESET_FAILED` otherwise.

---

### GET /api/user  *(auth)*
Returns the authenticated user. **200** — `{ "data": { "user": {...} } }`.

---

### GET /api/resumes  *(auth)*
Paginated list of the user's resumes. `?page=1&pageSize=15`.

**200**
```json
{
  "data": {
    "items": [ { "id": "...", "fileName": "resume.pdf", "status": "ready", "skillsCount": 12, "experienceYears": 5.0, ... } ],
    "page": 1, "pageSize": 15, "total": 3, "totalPages": 1
  }
}
```

---

### POST /api/resumes/upload  *(seeker, 5/hr rate limit)*
Multipart upload. `file` field. PDF only, ≤ 5MB.

```http
POST /api/resumes/upload
Authorization: Bearer ...
Content-Type: multipart/form-data; boundary=...

(file = resume.pdf)
```

**201 Created** — `{ "data": { "resume": {..., "status": "pending" } } }`.
**415** `INVALID_PDF` / `UNSUPPORTED_TYPE`. **413** `FILE_TOO_LARGE`. **429** `RATE_LIMITED`.

Triggers the `ParseResumeAndMatch` queue job (extracts text → skills →
experience_years → matches against every active job → fires
`resume_analysis` notification).

---

### GET /api/resumes/{id}  *(owner)*
**200** — full resume (includes `extractedText` for the owner only).
**404** / **403** otherwise.

---

### DELETE /api/resumes/{id}  *(owner)*
Best-effort deletes the stored file + the DB row. **200** — `{ "data": { "deleted": true } }`.

---

### GET /api/resumes/{id}/status  *(owner)*
**200** — `{ "data": { "status": "ready|pending|parsing|failed", "parseError": null, "skillsCount": 12, "experienceYears": 5.0 } }`.

---

### GET /api/resumes/{id}/matches  *(owner)*
Paginated matches for the resume. **200** — `{ "data": { "items": [MatchResource], "page": 1, ... } }`.

---

### POST /api/resumes/{id}/analyze  *(owner)*
Re-runs parsing + matching. **200** — `{ "data": { "status": "reanalyzing" } }`.

---

### GET /api/jobs  *(auth)*
Seekers see active jobs; recruiters see their own. `?q=search&page=1`.

---

### POST /api/jobs  *(recruiter)*
```json
{ "title": "Senior Engineer", "description": "...", "requiredSkills": ["Laravel", "PHP"], "isActive": true }
```

**201** — `{ "data": { "job": {...} } }`. Triggers `MatchResumeAgainstJobs` +
notifies seekers with `newJobs=true`.

---

### GET /api/jobs/{id}  *(auth)*
Seekers see active jobs; recruiters see their own (active or not).

---

### PUT /api/jobs/{id}  *(recruiter owner)*
Re-runs matching if `requiredSkills` changed.

---

### DELETE /api/jobs/{id}  *(recruiter owner)*
Cascades to matches.

---

### GET /api/jobs/{id}/candidates  *(recruiter owner)*
Ranked candidates for the job. **Privacy (§5):** returns only `skills`,
`experienceYears`, `matchedSkills`, `missingSkills`, `matchPercentage`,
`matchSource`, `analyzedAt`, `candidate.name` — NEVER `extractedText`.

`?minMatch=70&page=1`.

---

### GET /api/matches/{id}  *(owner)*
Single match detail.

---

### GET /api/matches/resume/{resumeId}  *(owner)*
Matches for a resume.

---

### GET /api/matches/job/{jobId}  *(recruiter owner)*
Privacy-safe candidate list (same shape as `/jobs/{id}/candidates`).

---

### GET /api/users/me  *(auth)*
Alias for `GET /api/user`.

---

### PATCH /api/users/me  *(auth)*
Update name or password.

---

### DELETE /api/users/me  *(auth)*
Soft-deletes the user (30-day retention per §5). Cascades to all related
tables. Revokes all tokens immediately.

---

### POST /api/users/export-data  *(auth)*
GDPR export — returns a JSON document with all of the user's data.

---

## Phase 2 — Resume Builder

### GET /api/templates  *(auth)*
List all 6 templates.

### GET /api/templates/{slug}  *(auth)*
Template metadata.

### POST /api/resumes/generate  *(auth, 10/hr rate limit)*
Create a new generated resume. Body:
```json
{ "templateId": "uuid", "contentJson": {...}, "customizationJson": { "primaryColor": "#059669", "fontFamily": "inter", "spacing": "normal", "fontSize": "medium" } }
```
If `originalResumeId` is provided, `contentJson` is prefilled from the
extracted resume data unless the caller also passes `contentJson`.

### GET /api/resumes/generate  *(auth)*
List current user's generated resumes.

### GET /api/resumes/generate/{id}  *(owner)*
### PUT /api/resumes/generate/{id}  *(owner)*
Updates `contentJson` / `customizationJson`. Snapshots a new `ResumeVersion`.
### DELETE /api/resumes/generate/{id}  *(owner)*

### GET /api/resumes/generate/{id}/preview  *(owner)*
Returns `{ "data": { "html": "..." } }` — the rendered HTML.

### POST /api/resumes/generate/{id}/export  *(owner)*
Body: `{ "format": "html" | "pdf" | "docx" }`.
Returns:
```json
{
  "data": {
    "format": "docx",
    "url": "https://s3.../generated/.../resume.docx?...",
    "path": "generated/uuid/uuid/resume.docx",
    "expiresAt": "2024-...",
    "caveat": "content-accurate, layout-approximate"
  }
}
```
`caveat` is only included for `docx` (per §6).

### POST /api/resumes/generate/{id}/tailor  *(owner, 10/hr)*
AI-tailor the resume to a specific job. Body: `{ "jobId": "uuid", "sections": ["summary","experience"] }`.
Returns the new summary + version number.

### POST /api/resumes/generate/{id}/enhance  *(owner, 10/hr)*
AI-enhance a single bullet/summary. Body: `{ "text": "...", "section": "bullet" }`.
Returns `{ "data": { "original": "...", "improved": "...", "source": "ai|fallback" } }`.

### GET /api/resumes/generate/{id}/versions  *(owner)*
Version history.

### POST /api/resumes/generate/{id}/versions/{version}/restore  *(owner)*
Snapshots the current state as a new version, then applies the target version's content.

---

## Phase 3 — Notifications

### POST /api/notifications/register-device  *(auth)*
Body: `{ "deviceToken": "...", "deviceType": "web|ios|android", "browserInfo": "..." }`.

### DELETE /api/notifications/device/{token}  *(auth owner)*
Soft-deactivates the device token.

### GET /api/notifications  *(auth)*
`?unreadOnly=true&page=1&pageSize=15`.

### PUT /api/notifications/{id}/read  *(auth owner)*
Returns 404 for cross-user notification IDs (no enumeration).

### PUT /api/notifications/read-all  *(auth)*
Returns `{ "data": { "updated": <count> } }`.

### GET /api/notifications/unread-count  *(auth)*
`{ "data": { "count": 3 } }`.

### GET /api/notifications/preferences  *(auth)*
Auto-creates defaults if missing.

### PUT /api/notifications/preferences  *(auth)*
Body: any subset of `{ emailNotifications, pushNotifications, jobMatches, resumeAnalysis, newJobs, dailyDigest }` (all booleans).

### POST /api/notifications/digest/run  *(admin: x-admin-secret header)*
Manually trigger the daily digest. Returns `{ "data": { "status": "dispatched" } }`.

### GET /api/notifications/firebase-config  *(public)*
Returns the browser-side Firebase config (no secrets).

---

## Phase 4 — Operations

### GET /api/health  *(public)*
`{ "data": { "status": "ok|degraded", "timestamp": "...", "service": "resume-matchmaker-laravel", "version": "...", "db": "ok", "cache": "ok" } }`.
Returns 503 when degraded.

---

## Error response shape

Every error response uses this shape:

```json
{
  "error": {
    "message": "Human-readable message.",
    "code": "MACHINE_CODE",
    "status": 404,
    "fieldErrors": { "email": ["The email field is required."] }
  }
}
```

`fieldErrors` is only present for 422 validation errors. `retryAfter` is
only present for 429 rate-limit errors.
