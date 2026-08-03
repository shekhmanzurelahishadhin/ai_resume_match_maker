// Matcher orchestration — combines skills extraction + semantic matching + scoring.
//
// Scoring formula (per §4 of spec):
//   match_percentage = round(100 * (0.70 * semanticSimilarity + 0.30 * skillsOverlap))
//
// Cache: 7-day TTL, keyed on md5(resumeText + jobText), stored in the AiCache Prisma model.
// When AI source changes mid-window the cached value is still served (it's annotated
// with the source that produced it).

import crypto from "node:crypto";

import { db } from "@/lib/db";
import { AI_CACHE_TTL_SECONDS } from "@/lib/constants";
import { getHuggingFaceService, type AiSource } from "@/lib/ai/huggingface";
import { notifyNewMatch } from "@/lib/notifications/triggers";

export interface MatchComputed {
  matchPercentage: number;
  matchSource: AiSource;
  matchedSkills: string[];
  missingSkills: string[];
  semanticSimilarity: number;
  skillsOverlap: number;
}

function md5(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}

function cacheKey(resumeText: string, jobText: string): string {
  return md5(`${resumeText}\u0000${jobText}`);
}

async function readCache<T>(key: string): Promise<T | null> {
  const row = await db.aiCache.findUnique({ where: { cacheKey: key } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.aiCache.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }
  return row.result as T;
}

async function writeCache<T>(
  key: string,
  result: T,
  source: AiSource,
): Promise<void> {
  const expiresAt = new Date(Date.now() + AI_CACHE_TTL_SECONDS * 1000);
  await db.aiCache.upsert({
    where: { cacheKey: key },
    create: { cacheKey: key, result: result as never, source, expiresAt },
    update: { result: result as never, source, expiresAt },
  });
}

/**
 * Compute the match score between a resume's text+skills and a job's text+required skills.
 * Uses cache when available; otherwise calls HuggingFaceService and writes back to cache.
 */
export async function computeMatch(params: {
  resumeText: string;
  resumeSkills: string[];
  jobText: string;
  jobRequiredSkills: string[];
}): Promise<MatchComputed> {
  const { resumeText, resumeSkills, jobText, jobRequiredSkills } = params;
  const key = cacheKey(resumeText, jobText);

  const cached = await readCache<MatchComputed>(key);
  if (cached) return cached;

  const hf = getHuggingFaceService();

  // Run both AI calls in parallel — they're independent.
  const [matchResult, _skillsResult] = await Promise.all([
    hf.matchResumeToJob(resumeText, jobText),
    // Re-extract skills just to record the AI source for skills (not used for scoring;
    // resume skills are already extracted at upload time and stored on the Resume row).
    Promise.resolve(null),
  ]);

  const semanticSimilarity = matchResult.result.similarity;
  const matchSource = matchResult.source;

  // Skills overlap: |resume ∩ job| / |job| (avoid div-by-zero).
  const resumeSet = new Set(resumeSkills.map((s) => s.toLowerCase()));
  const jobSkillsLower = jobRequiredSkills.map((s) => s.toLowerCase());
  const matched: string[] = [];
  const missing: string[] = [];
  for (let i = 0; i < jobRequiredSkills.length; i++) {
    const raw = jobRequiredSkills[i];
    const lower = jobSkillsLower[i];
    if (resumeSet.has(lower)) matched.push(raw);
    else missing.push(raw);
  }
  const skillsOverlap =
    jobRequiredSkills.length === 0
      ? 0.5 // neutral if the job has no required skills — neither perfect nor zero
      : matched.length / jobRequiredSkills.length;

  const combined =
    0.7 * semanticSimilarity + 0.3 * skillsOverlap;
  const matchPercentage = Math.round(Math.max(0, Math.min(1, combined)) * 100);

  const computed: MatchComputed = {
    matchPercentage,
    matchSource,
    matchedSkills: matched,
    missingSkills: missing,
    semanticSimilarity,
    skillsOverlap,
  };

  await writeCache(key, computed, matchSource).catch((err) => {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "ai_cache_write_failed",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return computed;
}

/**
 * Heuristic experience-year extractor.
 * Counts year ranges like "2020-2023", "2020 - 2023", "2020–Present", "2020 - Now".
 * Returns the maximum total span across all ranges found (capped at 50 years).
 */
export function computeExperienceYears(text: string): number {
  const present = /\b(present|current|now|today)\b/i;
  // Match "2018-2023", "2018 - 2023", "2018–2023", "2018 to 2023"
  const rangeRe =
    /\b(19\d{2}|20\d{2})\s*(?:-|–|—|to)\s*((?:19\d{2}|20\d{2})|present|current|now|today)\b/gi;
  const ranges: Array<{ start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = rangeRe.exec(text)) !== null) {
    const start = Number(m[1]);
    const endRaw = m[2].toLowerCase();
    const end = present.test(endRaw) ? new Date().getFullYear() : Number(endRaw);
    if (end >= start && end - start < 60) {
      ranges.push({ start, end });
    }
  }

  if (ranges.length === 0) return 0;

  // Sum non-overlapping spans by greedy sweep.
  ranges.sort((a, b) => a.start - b.start);
  let total = 0;
  let cursorEnd = -1;
  for (const r of ranges) {
    if (r.end <= cursorEnd) continue; // fully inside the previous merged range
    const start = Math.max(r.start, cursorEnd);
    total += r.end - start;
    cursorEnd = r.end;
  }
  return Math.min(50, Math.round(total * 10) / 10);
}

/**
 * Background-match a resume against every active job.
 * Idempotent: deletes existing matches for this resume before re-inserting.
 * Used after upload + after re-analyze.
 */
export async function matchResumeAgainstAllJobs(resumeId: string): Promise<number> {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume || !resume.extractedText) return 0;

  const activeJobs = await db.jobPost.findMany({ where: { isActive: true } });
  if (activeJobs.length === 0) return 0;

  const resumeSkills = extractSkillsList(resume.skillsJson);

  // Delete previous matches for this resume (they'll be recomputed).
  await db.match.deleteMany({ where: { resumeId } });

  let created = 0;
  for (const job of activeJobs) {
    const jobSkills = extractRequiredSkills(job.requiredSkillsJson);
    const computed = await computeMatch({
      resumeText: resume.extractedText,
      resumeSkills,
      jobText: `${job.title}\n${job.description}`,
      jobRequiredSkills: jobSkills,
    });

    const createdRow = await db.match.create({
      data: {
        resumeId: resume.id,
        jobPostId: job.id,
        recruiterId: job.recruiterId,
        matchPercentage: computed.matchPercentage,
        matchSource: computed.matchSource,
        matchedSkillsJson: { skills: computed.matchedSkills },
        missingSkillsJson: { skills: computed.missingSkills },
        analyzedAt: new Date(),
      },
    });
    // Fire the "New match" notification for high-quality matches. Wrapped
    // in try/catch so a notification failure can't poison the match loop.
    try {
      await notifyNewMatch(createdRow.id);
    } catch (e) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "match_notify_failed",
          matchId: createdRow.id,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }
    created++;
  }
  return created;
}

/**
 * Background-match a job against every seeker resume.
 * Idempotent: deletes existing matches for this job before re-inserting.
 * Used after a new job is created.
 */
export async function matchJobAgainstAllResumes(jobId: string): Promise<number> {
  const job = await db.jobPost.findUnique({ where: { id: jobId } });
  if (!job) return 0;
  const jobSkills = extractRequiredSkills(job.requiredSkillsJson);
  const jobText = `${job.title}\n${job.description}`;

  const readyResumes = await db.resume.findMany({
    where: { status: "ready", extractedText: { not: null } },
  });
  if (readyResumes.length === 0) return 0;

  // Delete previous matches for this job (they'll be recomputed).
  await db.match.deleteMany({ where: { jobPostId: jobId } });

  let created = 0;
  for (const resume of readyResumes) {
    const resumeSkills = extractSkillsList(resume.skillsJson);
    const computed = await computeMatch({
      resumeText: resume.extractedText ?? "",
      resumeSkills,
      jobText,
      jobRequiredSkills: jobSkills,
    });
    const createdRow = await db.match.create({
      data: {
        resumeId: resume.id,
        jobPostId: job.id,
        recruiterId: job.recruiterId,
        matchPercentage: computed.matchPercentage,
        matchSource: computed.matchSource,
        matchedSkillsJson: { skills: computed.matchedSkills },
        missingSkillsJson: { skills: computed.missingSkills },
        analyzedAt: new Date(),
      },
    });
    // Fire the "New match" notification for high-quality matches.
    try {
      await notifyNewMatch(createdRow.id);
    } catch (e) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "match_notify_failed",
          matchId: createdRow.id,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }
    created++;
  }
  return created;
}

// ---------- helpers ----------
function extractSkillsList(skillsJson: unknown): string[] {
  if (!skillsJson || typeof skillsJson !== "object") return [];
  const obj = skillsJson as { skills?: unknown };
  if (Array.isArray(obj.skills)) {
    return obj.skills.filter((s): s is string => typeof s === "string");
  }
  return [];
}

function extractRequiredSkills(json: unknown): string[] {
  if (!json || typeof json !== "object") return [];
  const obj = json as { skills?: unknown };
  if (Array.isArray(obj.skills)) {
    return obj.skills.filter((s): s is string => typeof s === "string");
  }
  return [];
}
