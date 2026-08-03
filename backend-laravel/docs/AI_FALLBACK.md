# AI Integration & Fallback Design

Every AI call in the Laravel backend returns an `AiResult<T>` — a struct
with `result: T` and `source: 'ai' | 'fallback'`. The fallback path is
the **single source of truth** for degraded mode: when the Hugging Face
Inference API is unreachable (or no API key is configured), the app
doesn't 500 — it returns a result annotated with `source: 'fallback'`
and the UI shows an "Estimated" badge instead of "AI-verified".

---

## 1. Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `HUGGINGFACE_API_KEY` | `""` | HF Inference API key. Empty → all calls fall back (sandbox default). |
| `HUGGINGFACE_INFERENCE_ENDPOINT` | `https://api-inference.huggingface.co` | Override for self-hosted HF inference endpoints. |
| `HUGGINGFACE_TIMEOUT` | `30` | HTTP timeout per request (seconds). |
| `HUGGINGFACE_RETRY_ATTEMPTS` | `3` | Max attempts before falling back. |
| `HUGGINGFACE_RETRY_BASE_DELAY_MS` | `2000` | Base delay for exponential backoff (2s, 4s, 8s). |
| `AI_CACHE_TTL_SECONDS` | `604800` | 7-day cache TTL for match results. |
| `HF_MODEL_NER_SKILLS` | `dslim/bert-base-NER` | Override the skill-extraction model. |
| `HF_MODEL_CROSS_ENCODER` | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Override the matching model. |
| `HF_MODEL_ZERO_SHOT` | `facebook/bart-large-mnli` | Override the categorization model. |
| `HF_MODEL_TEXT_GEN` | `google/flan-t5-base` | Override the enhancement/summary model. |

The full config is in `config/huggingface.php`.

---

## 2. The fallback table (§3 of spec)

| Operation | AI model | Fallback | When fallback fires |
|-----------|----------|----------|---------------------|
| Skill extraction | `dslim/bert-base-NER` | Curated 230+ skill dictionary (`app/Services/SkillsDictionary.php`) | Empty API key, HF 5xx, network error, malformed response, 3 retries exhausted, NER returned no entities. |
| Resume → Job matching | `cross-encoder/ms-marco-MiniLM-L-6-v2` | TF-IDF cosine similarity over the resume text + job text. | Same triggers. |
| Skill categorization | `facebook/bart-large-mnli` (zero-shot) | Static lookup table built into the dictionary. | Same. |
| Resume tailoring | `google/flan-t5-base` (text-generation) | Template-based bullet rewriting using extracted skills + job description. | Same. |
| Resume enhancement | `google/flan-t5-base` (text-generation) | Rule-based grammar + style fixes (capitalization, action verbs, "Responsible for" → "Delivered"). | Same. |

---

## 3. Retry policy

`HuggingFaceService::withRetry()` wraps every Guzzle call:

1. Attempt the request.
2. On any exception (`GuzzleException` or `Throwable`), log a structured
   JSON warning:
   ```json
   {"level":"warn","event":"ai_fallback","operation":"extractSkills","reason":"attempt 2 failed","error":"...","willRetry":true,"nextDelayMs":4000}
   ```
3. Sleep `base_delay_ms * 2^(attempt-1)` milliseconds (2s, 4s, 8s).
4. Repeat up to `HUGGINGFACE_RETRY_ATTEMPTS` (default 3).
5. If all attempts fail, return the fallback result with `source: 'fallback'`.

---

## 4. Caching

Match results are cached for 7 days in the `ai_caches` table, keyed on
`md5(resumeText + "\0" + jobText)`:

```php
$computed = $this->computeMatch($resumeText, $resumeSkills, $jobText, $jobRequiredSkills);
// ↳ checks ai_caches first; on miss calls HuggingFaceService + writes back.
```

The cached value is annotated with the source that produced it (`ai` vs
`fallback`). When the AI source changes mid-window, the cached value is
still served (the source label reflects the original computation, not the
current AI availability).

The `ai:purge-cache` command (scheduled 04:00 nightly) sweeps expired
rows. Expired rows are also lazy-deleted on read.

---

## 5. Enabling real AI

1. Get a Hugging Face access token at <https://huggingface.co/settings/tokens>.
2. Set `HUGGINGFACE_API_KEY=hf_...` in `.env`.
3. Restart the queue worker:
   ```bash
   sudo supervisorctl restart resumematchmaker-worker:*
   ```
4. All calls automatically switch to the AI path. Match results are
   annotated with `matchSource: "ai"` (visible in the UI as an
   "AI-verified" badge).

To verify the key is being read:

```bash
php artisan tinker
>>> app(\App\Services\HuggingFaceService::class)->isConfigured();
// => true
```

---

## 6. The fallback dictionary

`app/Services/SkillsDictionary.php` is a curated 230+ skill dictionary
across 5 categories:

- **Technical** — programming languages, frameworks, libraries.
- **Tools** — cloud, DevOps, databases, IDEs, design tools.
- **Soft Skills** — leadership, communication, Agile, etc.
- **Domain** — specializations (Web Development, ML, Cybersecurity, etc.).
- **Languages** — human languages.

The `extract()` method scans resume text for whole-word,
case-insensitive matches (with multi-word normalization so "Spring Boot"
matches even when written "springboot"). The `categorize()` method maps
an arbitrary skill label to one of the 5 buckets, falling back to
heuristic regex matching for unknown skills.

This is a **direct mirror** of `src/lib/ai/skills.ts` in the Next.js
frontend — the two implementations produce identical results for the
same input text.

---

## 7. TF-IDF cosine similarity

When the cross-encoder model is unavailable, `HuggingFaceService::tfidfCosine()`
computes a cosine similarity over tokenized text:

1. Tokenize both texts (lowercase, split on non-word boundaries, drop
   stop words).
2. Build L2-normalized term-frequency vectors.
3. Compute the dot product (which equals cosine similarity for
   L2-normalized vectors).
4. Clamp to `[0, 1]`.

This is an approximation — the IDF weights are set to 1 (no global
corpus). The cosine of two L2-normalized TF vectors is still a
meaningful overlap signal and correlates well with semantic similarity
for short technical texts.

---

## 8. Scoring formula

`MatchService::computeMatch()` combines the semantic similarity with a
skills-overlap score:

```
match_percentage = round(100 * (0.70 * semantic_similarity + 0.30 * skills_overlap))
```

- `semantic_similarity` ∈ [0, 1] — from the cross-encoder or TF-IDF fallback.
- `skills_overlap` = |resume_skills ∩ job_required_skills| / |job_required_skills|
  (0.5 neutral when the job has no required skills).
- `match_source` = the source of the semantic similarity call
  (`'ai'` or `'fallback'`).

The 70/30 weighting prioritizes semantic understanding while still
rewarding explicit skill matches. A resume with a perfect semantic match
but zero skill overlap scores 70%; a resume with zero semantic match but
perfect skill overlap scores 30%.

---

## 9. Observability

Every fallback trigger is logged as a structured JSON line to the
default Laravel log channel (`storage/logs/laravel.log` by default):

```json
{"level":"warn","event":"ai_fallback","operation":"extractSkills","reason":"no API key configured"}
{"level":"warn","event":"ai_fallback","operation":"matchResumeToJob","reason":"attempt 3 failed","error":"cURL error 28: ...","willRetry":false}
```

Filter with `grep '"event":"ai_fallback"' storage/logs/laravel.log` to
audit how often the fallback path fires in production.

---

## 10. Self-hosted HF inference endpoints

To use a self-hosted HF inference endpoint (e.g. a TGI server running on
a GPU node), set:

```dotenv
HUGGINGFACE_INFERENCE_ENDPOINT=https://my-tgi.internal
HF_MODEL_NER_SKILLS=my-org/my-ner-model
HF_MODEL_CROSS_ENCODER=my-org/my-cross-encoder
```

The `HuggingFaceService` posts to `{endpoint}/models/{model}` — the
same path the public HF Inference API uses, which TGI mirrors.
