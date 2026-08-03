<?php

namespace App\Services;

use App\Enums\MatchSource;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Log;
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
class HuggingFaceService
{
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

    // ---------- fallback implementations ----------

    /**
     * TF-IDF cosine similarity (with IDF approximated to 1 — the cosine of
     * two L2-normalized TF vectors is still a meaningful overlap signal).
     */
    public function tfidfCosine(string $a, string $b): float
    {
        $va = $this->tfVector($this->tokenize($a));
        $vb = $this->tfVector($this->tokenize($b));
        if (empty($va) || empty($vb)) {
            return 0.0;
        }
        // Iterate over the smaller vector for speed.
        [$small, $large] = count($va) <= count($vb) ? [$va, $vb] : [$vb, $va];
        $dot = 0.0;
        foreach ($small as $token => $weight) {
            if (isset($large[$token])) {
                $dot += $weight * $large[$token];
            }
        }
        return max(0.0, min(1.0, $dot));
    }

    /**
     * @param list<string> $skills
     */
    public function templateSummary(string $role, array $skills, int $experienceYears): string
    {
        $role = $role !== '' ? $role : 'professional';
        $skillStr = count($skills) > 0 ? ' Skilled in '.implode(', ', array_slice($skills, 0, 5)).'.' : '';
        $expStr = $experienceYears > 0
            ? sprintf(' %d+ years of experience delivering measurable impact.', $experienceYears)
            : ' Proven track record of delivering measurable impact.';
        return sprintf('%s with a focus on quality and collaboration.%s%s', ucfirst($role), $skillStr, $expStr);
    }

    public function ruleBasedEnhance(string $text): string
    {
        // Capitalize the first letter; ensure it starts with an action verb.
        $actionVerbs = ['Led', 'Built', 'Shipped', 'Improved', 'Designed', 'Implemented',
            'Optimized', 'Reduced', 'Increased', 'Launched', 'Created', 'Drove', 'Spearheaded'];
        $text = trim($text);
        if ($text === '') return '';
        $first = substr($text, 0, 1);
        if (ctype_lower($first)) {
            $text = strtoupper($first).substr($text, 1);
        }
        // If it doesn't start with an action verb-ish word, prepend "Delivered".
        $firstWord = explode(' ', $text)[0] ?? '';
        if (! in_array($firstWord, $actionVerbs, true) && ! preg_match('/^[A-Z][a-z]+ed$/', $firstWord)) {
            // Heuristic: if it begins with "Responsible for" or "Worked on", rewrite.
            if (preg_match('/^(responsible for|worked on|helped with|in charge of)\s+/i', $text)) {
                $text = preg_replace('/^(responsible for|worked on|helped with|in charge of)\s+/i', '', $text, 1);
                $text = 'Delivered '.$text;
            }
        }
        // Ensure it ends with a period.
        if (! str_ends_with($text, '.') && ! str_ends_with($text, '!')) {
            $text .= '.';
        }
        return $text;
    }

    // ---------- internals ----------

    private const STOP_WORDS = [
        'the','and','for','with','that','this','from','have','your','you','are','was',
        'were','been','being','has','had','will','would','could','should','may','might',
        'must','can','our','their','them','they','his','her','she','him','but','not','all',
        'any','into','out','over','under','than','then','there','here','what','when','where',
        'which','who','whom','whose','why','how','through','about','after','before','between',
        'during','without','within','across','along','also','such','very','more','most','some',
        'each','other','its','as','at','by','on','or','to','of','in','a','an','is','be','we','i',
    ];

    /**
     * @return list<string>
     */
    private function tokenize(string $text): array
    {
        $lower = strtolower($text);
        $tokens = preg_split('/[^a-z0-9+#.]+/', $lower) ?: [];
        $out = [];
        foreach ($tokens as $t) {
            $t = trim($t);
            if (strlen($t) >= 2 && ! in_array($t, self::STOP_WORDS, true)) {
                $out[] = $t;
            }
        }
        return $out;
    }

    /**
     * @param list<string> $tokens
     * @return array<string, float>
     */
    private function tfVector(array $tokens): array
    {
        if (empty($tokens)) return [];
        $counts = [];
        foreach ($tokens as $t) {
            $counts[$t] = ($counts[$t] ?? 0) + 1;
        }
        // L2 normalize.
        $norm = 0.0;
        foreach ($counts as $c) $norm += $c * $c;
        $norm = sqrt($norm) ?: 1.0;
        foreach ($counts as $k => $c) {
            $counts[$k] = $c / $norm;
        }
        return $counts;
    }

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

    private function logFallback(string $operation, string $reason, array $extra = []): void
    {
        Log::warning(json_encode(array_merge([
            'level' => 'warn',
            'event' => 'ai_fallback',
            'operation' => $operation,
            'reason' => $reason,
        ], $extra)));
    }
}
