// Resume Matchmaker — application-wide constants.
// Centralized so that rate limits, role names, file caps, etc. can be tuned in one place.

export const ROLES = {
  SEEKER: "seeker",
  RECRUITER: "recruiter",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const RESUME_STATUS = {
  PENDING: "pending",
  PARSING: "parsing",
  READY: "ready",
  FAILED: "failed",
} as const;

export type ResumeStatus = (typeof RESUME_STATUS)[keyof typeof RESUME_STATUS];

export const MATCH_SOURCE = {
  AI: "ai",
  FALLBACK: "fallback",
} as const;

export type MatchSource = (typeof MATCH_SOURCE)[keyof typeof MATCH_SOURCE];

// ---------- File upload limits ----------
export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_RESUME_MIME = "application/pdf";
export const PDF_MAGIC_BYTES = Buffer.from("%PDF", "ascii"); // first 4 bytes of any PDF

// ---------- Rate limits (§8 of spec) ----------
export const RATE_LIMITS = {
  GENERAL_API: { max: 60, windowSeconds: 60 }, // 60 req/min/user
  RESUME_UPLOAD: { max: 5, windowSeconds: 3600 }, // 5/hour/user
  RESUME_GENERATE: { max: 10, windowSeconds: 3600 }, // 10/hour/user (Phase 2)
} as const;

// ---------- AI cache TTL ----------
export const AI_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ---------- Pagination ----------
export const DEFAULT_PAGE_SIZE = 15;

// ---------- Hugging Face models (used by HuggingFaceService when key is present) ----------
export const HF_MODELS = {
  NER_SKILLS: "dslim/bert-base-NER",
  CROSS_ENCODER: "cross-encoder/ms-marco-MiniLM-L-6-v2",
  ZERO_SHOT_CLASSIFY: "facebook/bart-large-mnli",
} as const;

// ---------- AI retry policy ----------
export const HF_RETRY = {
  ATTEMPTS: 3,
  BASE_DELAY_MS: 2000,
} as const;

// ---------- Auth ----------
export const BCRYPT_ROUNDS = 10;
export const JWT_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

// ---------- Password reset tokens ----------
export const PASSWORD_RESET_TTL_SECONDS = 60 * 60; // 1 hour
