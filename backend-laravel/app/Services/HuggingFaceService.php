<?php

namespace App\Services;

use App\Enums\MatchSource;
use App\Services\Concerns\AiFallbacks;
use App\Services\Contracts\AiService;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Str;

/**
 * Hugging Face Inference API wrapper with explicit fallback paths (§3).
 *
 * Every public method returns AiResult<T> = ['result' => T, 'source' => 'ai'|'fallback'].
 * When HUGGINGFACE_API_KEY is empty (sandbox default), every call short-circuits
 * to the fallback path — no network attempt is made.
 *
 * Retry policy: 3 attempts with exponential backoff (base 2s). All fallback
 * triggers are logged as structured JSON lines.
 */
class HuggingFaceService implements AiService
{
    use AiFallbacks;

    private Client $client;
    private bool $hasKey;
    private int $retryAttempts;
    private int $retryBaseDelayMs;
    private int $maxInputChars;

    public function __construct(
        ?Client $client = null,
        ?CacheService $cache = null
    ) {
        $cfg = config('huggingface');
        $this->hasKey = filled($cfg['api_key'] ?? null);
        $this->retryAttempts = (int) ($cfg['retry']['attempts'] ?? 3);
        $this->retryBaseDelayMs = (int) ($cfg['retry']['base_delay_ms'] ?? 2000);
        $this->maxInputChars = (int) ($cfg['max_input_chars'] ?? 4000);

        $this->client = $client ?? new Client([
            'base_uri' => $cfg['endpoint'] ?? 'https://api-inference.huggingface.co',
            'timeout' => (int) ($cfg['timeout'] ?? 30),
            'headers' => $this->hasKey ? [
                'Authorization' => 'Bearer '.$cfg['api_key'],
                'Content-Type' => 'application/json',
            ] : [],
        ]);
    }

    public function isConfigured(): bool
    {
        return $this->hasKey;
    }

    /**
     * Extract skills from resume text.
     * AI: dslim/bert-base-NER → entity spans → dedupe + categorize.
     * Fallback: SkillsDictionary::extract().
     *
     * @return AiResult<array{skills: list<string>, categories: array<string, list<string>>}>
     */
    public function extractSkills(string $text): AiResult
    {
        if (! $this->hasKey) {
            $this->logFallback('extractSkills', 'no API key configured');
            return AiResult::fallback(SkillsDictionary::extract($text));
        }

        $attempted = $this->withRetry('extractSkills', function () use ($text) {
            $response = $this->client->post('/models/'.config('huggingface.models.ner_skills'), [
                'json' => ['inputs' => Str::limit($text, $this->maxInputChars)],
            ]);
            return json_decode((string) $response->getBody(), true) ?? [];
        });

        if (! $attempted->ok) {
            $this->logFallback('extractSkills', 'all retries failed', ['error' => $attempted->error]);
            return AiResult::fallback(SkillsDictionary::extract($text));
        }

        // NER returns [[{entity_group, word, score}], ...] — flatten + filter.
        $entities = $attempted->value;
        if (isset($entities[0]) && is_array($entities[0])) {
            $entities = $entities[0];
        }

        $seen = [];
        $skills = [];
        foreach ($entities as $ent) {
            if (! is_array($ent)) continue;
            $group = strtoupper($ent['entity_group'] ?? $ent['entity'] ?? '');
            if (in_array($group, ['PER', 'PERSON'], true)) continue;
            $score = (float) ($ent['score'] ?? 0);
            if ($score < 0.7) continue;
            $word = trim(str_replace('##', '', (string)($ent['word'] ?? '')));
            if (strlen($word) < 2) continue;
            $key = strtolower($word);
            if (isset($seen[$key])) continue;
            $seen[$key] = true;
            $skills[] = $word;
        }

        if (empty($skills)) {
            $this->logFallback('extractSkills', 'NER returned no entities');
            return AiResult::fallback(SkillsDictionary::extract($text));
        }

        $categories = SkillsDictionary::emptyCategories();
        foreach ($skills as $s) {
            $categories[SkillsDictionary::categorize($s)][] = $s;
        }
        foreach ($categories as $cat => $list) {
            sort($categories[$cat]);
        }
        sort($skills);

        return AiResult::ai(['skills' => $skills, 'categories' => $categories]);
    }

    /**
     * Compute semantic similarity between resume and job text.
     * AI: cross-encoder/ms-marco-MiniLM-L-6-v2 → score in [0, 1].
     * Fallback: TF-IDF cosine similarity on tokenized text.
     *
     * @return AiResult<array{similarity: float}>
     */
    public function matchResumeToJob(string $resumeText, string $jobText): AiResult
    {
        if (! $this->hasKey) {
            $this->logFallback('matchResumeToJob', 'no API key configured');
            return AiResult::fallback(['similarity' => $this->tfidfCosine($resumeText, $jobText)]);
        }

        $attempted = $this->withRetry('matchResumeToJob', function () use ($resumeText, $jobText) {
            $response = $this->client->post('/models/'.config('huggingface.models.cross_encoder'), [
                'json' => [
                    'inputs' => [
                        'text' => Str::limit($jobText, $this->maxInputChars),
                        'text_pair' => Str::limit($resumeText, $this->maxInputChars),
                    ],
                ],
            ]);
            return json_decode((string) $response->getBody(), true) ?? [];
        });

        if (! $attempted->ok) {
            $this->logFallback('matchResumeToJob', 'all retries failed', ['error' => $attempted->error]);
            return AiResult::fallback(['similarity' => $this->tfidfCosine($resumeText, $jobText)]);
        }

        $score = 0.0;
        if (is_array($attempted->value) && isset($attempted->value[0]['score'])) {
            $score = (float) $attempted->value[0]['score'];
        } elseif (is_array($attempted->value) && isset($attempted->value[0]) && is_array($attempted->value[0])) {
            // Take the max score across all returned labels.
            foreach ($attempted->value[0] as $labelRow) {
                $score = max($score, (float)($labelRow['score'] ?? 0));
            }
        }
        $score = max(0.0, min(1.0, $score));

        return AiResult::ai(['similarity' => $score]);
    }

    /**
     * Categorize a single skill label.
     * AI: facebook/bart-large-mnli zero-shot with candidate labels.
     * Fallback: SkillsDictionary::categorize().
     *
     * @return AiResult<string>
     */
    public function categorizeSkill(string $skill): AiResult
    {
        if (! $this->hasKey) {
            $this->logFallback('categorizeSkill', 'no API key configured', ['skill' => $skill]);
            return AiResult::fallback(SkillsDictionary::categorize($skill));
        }

        $labels = SkillsDictionary::CATEGORIES;
        $attempted = $this->withRetry('categorizeSkill', function () use ($skill, $labels) {
            $response = $this->client->post('/models/'.config('huggingface.models.zero_shot_classify'), [
                'json' => [
                    'inputs' => $skill,
                    'parameters' => ['candidate_labels' => $labels],
                ],
            ]);
            return json_decode((string) $response->getBody(), true) ?? [];
        });

        if (! $attempted->ok) {
            $this->logFallback('categorizeSkill', 'all retries failed', ['skill' => $skill, 'error' => $attempted->error]);
            return AiResult::fallback(SkillsDictionary::categorize($skill));
        }

        $top = $attempted->value['labels'][0] ?? null;
        if (! $top || ! in_array($top, $labels, true)) {
            $this->logFallback('categorizeSkill', 'unexpected zero-shot output', ['skill' => $skill]);
            return AiResult::fallback(SkillsDictionary::categorize($skill));
        }
        return AiResult::ai($top);
    }

    /**
     * Enhance a single resume bullet / summary line.
     * AI: google/flan-t5-base text-generation with an improvement prompt.
     * Fallback: rule-based grammar + style fixes.
     *
     * @return AiResult<string>
     */
    public function enhanceBullet(string $text): AiResult
    {
        $trimmed = trim($text);
        if ($trimmed === '') {
            return AiResult::fallback('');
        }
        if (! $this->hasKey) {
            $this->logFallback('enhanceBullet', 'no API key configured');
            return AiResult::fallback($this->ruleBasedEnhance($trimmed));
        }

        $prompt = 'Rewrite this resume bullet point to be more impactful, specific, and '
            .'action-oriented. Keep it under 30 words. Use the STAR format where possible. '
            .'Bullet: "'.$trimmed.'"';

        $attempted = $this->withRetry('enhanceBullet', function () use ($prompt) {
            $response = $this->client->post('/models/'.config('huggingface.models.text_generation'), [
                'json' => [
                    'inputs' => $prompt,
                    'parameters' => ['max_new_tokens' => 80, 'temperature' => 0.7],
                ],
            ]);
            $body = json_decode((string) $response->getBody(), true) ?? [];
            // HF returns [{generated_text: "..."}]
            if (isset($body[0]['generated_text'])) {
                return $body[0]['generated_text'];
            }
            return $body['generated_text'] ?? '';
        });

        if (! $attempted->ok) {
            $this->logFallback('enhanceBullet', 'all retries failed', ['error' => $attempted->error]);
            return AiResult::fallback($this->ruleBasedEnhance($trimmed));
        }

        $raw = trim((string) $attempted->value);
        if ($raw === '') {
            $this->logFallback('enhanceBullet', 'empty model output');
            return AiResult::fallback($this->ruleBasedEnhance($trimmed));
        }

        // Strip prompt echoes.
        $cleaned = preg_replace('/^bullet\s*:\s*/i', '', $raw);
        $cleaned = preg_replace('/^[\"\'`]+|[\"\'`]+$/', '', $cleaned ?? '');
        $cleaned = trim($cleaned ?? '');
        if ($cleaned === '') {
            return AiResult::fallback($this->ruleBasedEnhance($trimmed));
        }
        return AiResult::ai($cleaned);
    }

    /**
     * Generate a professional summary paragraph from extracted skills + role.
     * AI: google/flan-t5-base with a summary prompt.
     * Fallback: template-based summary using top skills + role.
     *
     * @param list<string> $skills
     * @return AiResult<string>
     */
    public function generateSummary(string $role, array $skills, int $experienceYears = 0): AiResult
    {
        $topSkills = array_slice($skills, 0, 5);
        if (count($topSkills) === 0) {
            return AiResult::fallback($this->templateSummary($role, $topSkills, $experienceYears));
        }

        if (! $this->hasKey) {
            $this->logFallback('generateSummary', 'no API key configured');
            return AiResult::fallback($this->templateSummary($role, $topSkills, $experienceYears));
        }

        $prompt = sprintf(
            "Write a 2-sentence professional resume summary for a %s with %d years of experience. Key skills: %s.",
            $role ?: 'professional',
            $experienceYears,
            implode(', ', $topSkills)
        );

        $attempted = $this->withRetry('generateSummary', function () use ($prompt) {
            $response = $this->client->post('/models/'.config('huggingface.models.text_generation'), [
                'json' => [
                    'inputs' => $prompt,
                    'parameters' => ['max_new_tokens' => 120, 'temperature' => 0.7],
                ],
            ]);
            $body = json_decode((string) $response->getBody(), true) ?? [];
            return $body[0]['generated_text'] ?? $body['generated_text'] ?? '';
        });

        if (! $attempted->ok) {
            $this->logFallback('generateSummary', 'all retries failed', ['error' => $attempted->error]);
            return AiResult::fallback($this->templateSummary($role, $topSkills, $experienceYears));
        }

        $cleaned = trim((string) $attempted->value);
        if ($cleaned === '') {
            return AiResult::fallback($this->templateSummary($role, $topSkills, $experienceYears));
        }
        return AiResult::ai($cleaned);
    }

    /**
     * Turn raw resume text into structured builder content.
     *
     * The Hugging Face task pipelines cannot do reliable structured extraction,
     * so this always takes the heuristic path. Configure a Groq key (or set
     * AI_PROVIDER=groq) for the AI-quality parse.
     *
     * @return AiResult<array<string, mixed>>
     */
    public function extractResumeContent(string $text): AiResult
    {
        $this->logFallback('extractResumeContent', 'no structured-extraction pipeline on this provider');

        return AiResult::fallback($this->heuristicResumeContent(trim($text)));
    }

    // ---------- internals ----------

    /**
     * @param callable(): mixed $fn
     * @return RetryResult
     */
    private function withRetry(string $op, callable $fn): RetryResult
    {
        $lastError = '';
        for ($attempt = 1; $attempt <= $this->retryAttempts; $attempt++) {
            try {
                $value = $fn();
                return RetryResult::ok($value);
            } catch (GuzzleException|\Throwable $e) {
                $lastError = $e->getMessage();
                $isLast = $attempt === $this->retryAttempts;
                $delayMs = (int) ($this->retryBaseDelayMs * pow(2, $attempt - 1));
                $this->logFallback($op, "attempt {$attempt} failed", [
                    'error' => $lastError,
                    'willRetry' => ! $isLast,
                    'nextDelayMs' => $isLast ? null : $delayMs,
                ]);
                if (! $isLast) {
                    usleep($delayMs * 1000);
                }
            }
        }
        return RetryResult::fail($lastError);
    }

}
