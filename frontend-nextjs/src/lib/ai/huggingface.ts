// HuggingFaceService — wraps the @huggingface/inference SDK with explicit fallback paths.
//
// All methods return `{ result, source: 'ai' | 'fallback' }`.
// When HUGGINGFACE_API_KEY is empty (sandbox), every AI call short-circuits to the
// fallback path — this is intentional and demonstrates the degraded-but-still-functional
// mode of the system.
//
// Retry policy: 3 attempts with exponential backoff (base 2s). All fallback triggers
// are logged to the console with structured fields.

import { HfInference } from "@huggingface/inference";

import { HF_MODELS, HF_RETRY } from "@/lib/constants";
import {
  dictionaryExtractSkills,
  categorizeSkill as staticCategorize,
  type SkillCategory,
} from "@/lib/ai/skills";

export type AiSource = "ai" | "fallback";

export interface AiResult<T> {
  result: T;
  source: AiSource;
}

function structuredFallbackLog(
  operation: string,
  reason: string,
  extra?: Record<string, unknown>,
) {
  // Structured console log so the operator can see exactly when the AI failed.
  console.warn(
    JSON.stringify({
      level: "warn",
      event: "ai_fallback",
      operation,
      reason,
      ...(extra ?? {}),
    }),
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  op: string,
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= HF_RETRY.ATTEMPTS; attempt++) {
    try {
      const value = await fn();
      return { ok: true, value };
    } catch (err) {
      lastError = err;
      const isLast = attempt === HF_RETRY.ATTEMPTS;
      const delay = HF_RETRY.BASE_DELAY_MS * Math.pow(2, attempt - 1);
      structuredFallbackLog(op, `attempt ${attempt} failed`, {
        error: err instanceof Error ? err.message : String(err),
        willRetry: !isLast,
        nextDelayMs: isLast ? null : delay,
      });
      if (!isLast) await sleep(delay);
    }
  }
  return {
    ok: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

export interface ExtractedSkills {
  skills: string[];
  categories: Record<SkillCategory, string[]>;
}

export interface MatchScore {
  /** Cosine / cross-encoder similarity in [0, 1]. */
  similarity: number;
}

export class HuggingFaceService {
  private hf: HfInference | null;
  private hasKey: boolean;

  constructor(apiKey?: string) {
    this.hasKey = Boolean(apiKey && apiKey.trim().length > 0);
    this.hf = this.hasKey ? new HfInference(apiKey) : null;
  }

  /**
   * Extract skills from resume text.
   * AI: dslim/bert-base-NER → extract entity spans, then dedupe + categorize.
   * Fallback: curated dictionary match (lib/ai/skills.ts).
   */
  async extractSkills(text: string): Promise<AiResult<ExtractedSkills>> {
    if (!this.hf) {
      structuredFallbackLog("extractSkills", "no API key configured");
      return { result: dictionaryExtractSkills(text), source: "fallback" };
    }

    const attempted = await withRetry("extractSkills", async () => {
      // Note: the SDK exposes `tokenClassification` for NER models.
      // @ts-expect-error — tokenClassification exists on HfInference but TS types
      // are flaky across versions. Runtime is what matters here.
      const out = await this.hf!.tokenClassification({
        model: HF_MODELS.NER_SKILLS,
        inputs: text.slice(0, 4000), // truncate to keep within model limits
      });
      return out as Array<{ entity_group: string; word: string; score: number }>;
    });

    if (!attempted.ok) {
      structuredFallbackLog("extractSkills", "all retries failed", {
        error: attempted.error,
      });
      return { result: dictionaryExtractSkills(text), source: "fallback" };
    }

    // NER returns PERSON/ORG/LOC/MISC etc. We accept any non-PERSON entity with a
    // high score and treat them as candidate skill tokens. Then run them through
    // the categorizer for grouping.
    const seen = new Set<string>();
    const skills: string[] = [];
    for (const ent of attempted.value) {
      const group = (ent.entity_group ?? "").toUpperCase();
      if (group === "PER" || group === "PERSON") continue;
      if (ent.score < 0.7) continue;
      const word = ent.word.replace(/^##/, "").trim();
      if (!word || word.length < 2) continue;
      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      skills.push(word);
    }

    // If NER produced nothing useful, fall back to the dictionary.
    if (skills.length === 0) {
      structuredFallbackLog("extractSkills", "NER returned no entities");
      return { result: dictionaryExtractSkills(text), source: "fallback" };
    }

    const categories: Record<SkillCategory, string[]> = {
      Technical: [],
      Tools: [],
      "Soft Skills": [],
      Domain: [],
      Languages: [],
    };
    for (const s of skills) categories[staticCategorize(s)].push(s);
    (Object.keys(categories) as SkillCategory[]).forEach((k) =>
      categories[k].sort((a, b) => a.localeCompare(b)),
    );

    return {
      result: { skills: skills.sort((a, b) => a.localeCompare(b)), categories },
      source: "ai",
    };
  }

  /**
   * Compute semantic similarity between resume and job text.
   * AI: cross-encoder/ms-marco-MiniLM-L-6-v2 → returns score in [0, 1].
   * Fallback: TF-IDF cosine similarity on extracted keywords.
   */
  async matchResumeToJob(
    resumeText: string,
    jobText: string,
  ): Promise<AiResult<MatchScore>> {
    if (!this.hf) {
      structuredFallbackLog("matchResumeToJob", "no API key configured");
      return {
        result: { similarity: tfidfCosine(resumeText, jobText) },
        source: "fallback",
      };
    }

    const attempted = await withRetry("matchResumeToJob", async () => {
      // The cross-encoder model returns a single relevance score per pair.
      // @ts-expect-error — SDK shape varies; runtime is authoritative.
      const out = await this.hf!.textClassification({
        model: HF_MODELS.CROSS_ENCODER,
        inputs: { text: jobText.slice(0, 4000), text_pair: resumeText.slice(0, 4000) },
      });
      return out as Array<{ label: string; score: number }>;
    });

    if (!attempted.ok) {
      structuredFallbackLog("matchResumeToJob", "all retries failed", {
        error: attempted.error,
      });
      return {
        result: { similarity: tfidfCosine(resumeText, jobText) },
        source: "fallback",
      };
    }

    // Cross-encoders typically return [{ label: 'LABEL_1', score: 0.xx }] (relevance).
    // Take the max score across all labels and clamp to [0, 1].
    const score = Math.max(0, Math.min(1, attempted.value[0]?.score ?? 0));
    return { result: { similarity: score }, source: "ai" };
  }

  /**
   * Enhance a single bullet / summary line.
   * AI: google/flan-t5-base → text2text generation with an "improve this resume
   * bullet point" prompt.
   * Fallback: returns the original text verbatim with source='fallback'.
   * (Used by the Phase 2 resume builder's "enhance" button.)
   */
  async enhanceBullet(text: string): Promise<AiResult<string>> {
    const trimmed = (text ?? "").trim();
    if (!trimmed) {
      return { result: "", source: "fallback" };
    }
    if (!this.hf) {
      structuredFallbackLog("enhanceBullet", "no API key configured");
      return { result: trimmed, source: "fallback" };
    }

    const prompt =
      "Rewrite this resume bullet point to be more impactful, specific, and " +
      "action-oriented. Keep it under 30 words. Use the STAR format where possible. " +
      `Bullet: "${trimmed.slice(0, 500)}"`;

    const attempted = await withRetry("enhanceBullet", async () => {
      // @ts-expect-error — SDK shape varies; runtime is authoritative.
      const out = await this.hf!.textGeneration({
        model: "google/flan-t5-base",
        inputs: prompt,
        parameters: { max_new_tokens: 80, temperature: 0.7 },
      });
      return out as { generated_text?: string };
    });

    if (!attempted.ok) {
      structuredFallbackLog("enhanceBullet", "all retries failed", {
        error: attempted.error,
      });
      return { result: trimmed, source: "fallback" };
    }

    const raw = (attempted.value?.generated_text ?? "").trim();
    if (!raw) {
      structuredFallbackLog("enhanceBullet", "empty model output");
      return { result: trimmed, source: "fallback" };
    }
    // Strip a leading "Bullet:" or quote marks if the model echoes the prompt.
    const cleaned = raw
      .replace(/^bullet\s*:\s*/i, "")
      .replace(/^["'`]+|["'`]+$/g, "")
      .trim();
    if (!cleaned) return { result: trimmed, source: "fallback" };
    return { result: cleaned, source: "ai" };
  }

  /**
   * Categorize a single skill label into one of 5 buckets.
   * AI: facebook/bart-large-mnli zero-shot with candidate labels.
   * Fallback: static mapping (lib/ai/skills.ts).
   */
  async categorizeSkill(skill: string): Promise<AiResult<SkillCategory>> {
    if (!this.hf) {
      structuredFallbackLog("categorizeSkill", "no API key configured", { skill });
      return { result: staticCategorize(skill), source: "fallback" };
    }

    const labels: SkillCategory[] = [
      "Technical",
      "Tools",
      "Soft Skills",
      "Domain",
      "Languages",
    ];
    const attempted = await withRetry("categorizeSkill", async () => {
      // @ts-expect-error — SDK shape varies; runtime is authoritative.
      const out = await this.hf!.zeroShotClassification({
        model: HF_MODELS.ZERO_SHOT_CLASSIFY,
        inputs: skill,
        parameters: { candidate_labels: labels },
      });
      return out as { labels: string[]; scores: number[] };
    });

    if (!attempted.ok) {
      structuredFallbackLog("categorizeSkill", "all retries failed", {
        skill,
        error: attempted.error,
      });
      return { result: staticCategorize(skill), source: "fallback" };
    }

    const top = attempted.value.labels?.[0] as SkillCategory | undefined;
    if (!top || !labels.includes(top)) {
      structuredFallbackLog("categorizeSkill", "unexpected zero-shot output", {
        skill,
      });
      return { result: staticCategorize(skill), source: "fallback" };
    }
    return { result: top, source: "ai" };
  }
}

// ---------- TF-IDF cosine similarity (fallback for matching) ----------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set<string>([
  "the","and","for","with","that","this","from","have","your","you","are","was",
  "were","been","being","have","has","had","will","would","could","should","may",
  "might","must","can","our","their","them","they","his","her","she","him","his",
  "but","not","all","any","into","out","over","under","than","then","there","here",
  "what","when","where","which","who","whom","whose","why","how","through","about",
  "after","before","between","during","without","within","across","along","also",
  "such","very","more","most","some","any","each","other","its","it","as","at","by",
  "on","or","to","of","in","a","an","is","be","we","i","me","my","mine","your",
  "yours","our","ours","1","2","3","4","5","6","7","8","9","0",
]);

/** Term frequency vector. */
function tfVector(tokens: string[]): Map<string, number> {
  const v = new Map<string, number>();
  for (const t of tokens) v.set(t, (v.get(t) ?? 0) + 1);
  // L2 normalize
  let norm = 0;
  for (const c of v.values()) norm += c * c;
  norm = Math.sqrt(norm) || 1;
  for (const [k, c] of v) v.set(k, c / norm);
  return v;
}

function tfidfCosine(a: string, b: string): number {
  // We approximate IDF with 1 (no global corpus) — the cosine of two
  // L2-normalized TF vectors is still a meaningful overlap signal.
  const va = tfVector(tokenize(a));
  const vb = tfVector(tokenize(b));
  let dot = 0;
  // Iterate over the smaller vector for speed.
  const [small, large] = va.size < vb.size ? [va, vb] : [vb, va];
  for (const [k, v] of small) {
    const w = large.get(k);
    if (w) dot += v * w;
  }
  // Vectors are already L2-normalized, so dot == cosine.
  return Math.max(0, Math.min(1, dot));
}

// ---------- Singleton ----------
// Lazy-load the API key from env so tests / Next.js can read it at runtime.
let _service: HuggingFaceService | null = null;
export function getHuggingFaceService(): HuggingFaceService {
  if (!_service) {
    _service = new HuggingFaceService(process.env.HUGGINGFACE_API_KEY);
  }
  return _service;
}
