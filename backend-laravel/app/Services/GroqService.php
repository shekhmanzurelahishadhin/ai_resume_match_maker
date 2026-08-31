<?php

namespace App\Services;

use App\Services\Concerns\AiFallbacks;
use App\Services\Contracts\AiService;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Str;

/**
 * Groq provider — the same AiService contract as HuggingFaceService, backed by
 * Groq's OpenAI-compatible chat-completions API (§3).
 *
 * Groq has no task pipelines and no embeddings endpoint, so each operation is a
 * prompt constrained to return JSON. Every method degrades to the exact same
 * deterministic fallbacks the Hugging Face path uses, so behaviour is unchanged
 * when the key is absent or the call fails.
 */
class GroqService implements AiService
{
    use AiFallbacks;

    private Client $client;
    private bool $hasKey;
    private string $model;
    private int $retryAttempts;
    private int $retryBaseDelayMs;
    private int $maxInputChars;

    public function __construct(?Client $client = null)
    {
        $cfg = config('groq');
        $this->hasKey = filled($cfg['api_key'] ?? null);
        $this->model = (string) ($cfg['model'] ?? 'openai/gpt-oss-120b');
        $this->retryAttempts = (int) ($cfg['retry']['attempts'] ?? 3);
        $this->retryBaseDelayMs = (int) ($cfg['retry']['base_delay_ms'] ?? 2000);
        $this->maxInputChars = (int) ($cfg['max_input_chars'] ?? 12000);

        $this->client = $client ?? new Client([
            'base_uri' => rtrim($cfg['endpoint'] ?? 'https://api.groq.com/openai/v1', '/').'/',
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
     * AI: one call returning skills already grouped into the 5 categories.
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

        $labels = SkillsDictionary::CATEGORIES;
        $system = 'You extract skills from resumes. Reply with a JSON object whose keys are '
            .'exactly: '.$this->quotedList($labels).'. Each value is an array of skill names '
            .'found in the resume, grouped under the category it belongs to. Use the '
            .'candidate\'s own wording (e.g. "React", "PostgreSQL", "Stakeholder management"). '
            .'Do not invent skills that are not supported by the text. Omit duplicates. '
            .'Use an empty array for a category with no skills.';

        $attempted = $this->withRetry('extractSkills', fn () => $this->chatJson(
            $system,
            Str::limit($text, $this->maxInputChars),
            (int) config('groq.max_tokens.extract_skills', 3072),
        ));

        if (! $attempted->ok) {
            $this->logFallback('extractSkills', 'all retries failed', ['error' => $attempted->error]);
            return AiResult::fallback(SkillsDictionary::extract($text));
        }

        $payload = is_array($attempted->value) ? $attempted->value : [];
        $categories = SkillsDictionary::emptyCategories();
        $seen = [];
        $skills = [];

        foreach ($labels as $category) {
            $entries = $payload[$category] ?? null;
            if (! is_array($entries)) continue;
            foreach ($entries as $entry) {
                if (! is_string($entry)) continue;
                $skill = trim($entry);
                if (strlen($skill) < 2) continue;
                $key = strtolower($skill);
                if (isset($seen[$key])) continue;
                $seen[$key] = true;
                $categories[$category][] = $skill;
                $skills[] = $skill;
            }
        }

        if (empty($skills)) {
            $this->logFallback('extractSkills', 'model returned no skills');
            return AiResult::fallback(SkillsDictionary::extract($text));
        }

        foreach ($categories as $cat => $list) {
            sort($categories[$cat]);
        }
        sort($skills);

        return AiResult::ai(['skills' => $skills, 'categories' => $categories]);
    }

    /**
     * Compute semantic similarity between resume and job text.
     * AI: the model scores relevance 0-100; divided to [0, 1] for the caller.
     * Fallback: TF-IDF cosine similarity.
     *
     * Temperature is pinned to 0 and MatchService caches the result, so a given
     * resume/job pair scores once and stays stable.
     *
     * @return AiResult<array{similarity: float}>
     */
    public function matchResumeToJob(string $resumeText, string $jobText): AiResult
    {
        if (! $this->hasKey) {
            $this->logFallback('matchResumeToJob', 'no API key configured');
            return AiResult::fallback(['similarity' => $this->tfidfCosine($resumeText, $jobText)]);
        }

        $system = 'You are a technical recruiter scoring how well a candidate\'s resume fits '
            .'a job posting. Weigh required skills, seniority and domain relevance. Reply with '
            .'JSON in the form {"score": <integer 0-100>} where 0 is no fit at all and 100 is '
            .'an ideal fit. Return only that key.';

        $user = "JOB POSTING:\n".Str::limit($jobText, $this->maxInputChars)
            ."\n\nRESUME:\n".Str::limit($resumeText, $this->maxInputChars);

        $attempted = $this->withRetry('matchResumeToJob', fn () => $this->chatJson(
            $system,
            $user,
            (int) config('groq.max_tokens.match_resume_to_job', 512),
        ));

        if (! $attempted->ok) {
            $this->logFallback('matchResumeToJob', 'all retries failed', ['error' => $attempted->error]);
            return AiResult::fallback(['similarity' => $this->tfidfCosine($resumeText, $jobText)]);
        }

        $raw = is_array($attempted->value) ? ($attempted->value['score'] ?? null) : null;
        if (! is_numeric($raw)) {
            $this->logFallback('matchResumeToJob', 'model returned a non-numeric score');
            return AiResult::fallback(['similarity' => $this->tfidfCosine($resumeText, $jobText)]);
        }

        $similarity = max(0.0, min(1.0, ((float) $raw) / 100));

        return AiResult::ai(['similarity' => $similarity]);
    }

    /**
     * Categorize a single skill label.
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
        $system = 'Classify the given professional skill into exactly one category. '
            .'Allowed categories: '.$this->quotedList($labels).'. '
            .'Reply with JSON: {"category": "<one of the allowed values>"}.';

        $attempted = $this->withRetry('categorizeSkill', fn () => $this->chatJson(
            $system,
            $skill,
            (int) config('groq.max_tokens.categorize_skill', 256),
        ));

        if (! $attempted->ok) {
            $this->logFallback('categorizeSkill', 'all retries failed', ['skill' => $skill, 'error' => $attempted->error]);
            return AiResult::fallback(SkillsDictionary::categorize($skill));
        }

        $label = is_array($attempted->value) ? ($attempted->value['category'] ?? null) : null;
        if (! is_string($label) || ! in_array($label, $labels, true)) {
            $this->logFallback('categorizeSkill', 'unexpected category label', [
                'skill' => $skill,
                'label' => is_scalar($label) ? (string) $label : gettype($label),
            ]);
            return AiResult::fallback(SkillsDictionary::categorize($skill));
        }

        return AiResult::ai($label);
    }

    /**
     * Enhance a single resume bullet / summary line.
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

        $system = 'You rewrite resume bullet points to be more impactful, specific and '
            .'action-oriented. Lead with a strong action verb, keep the candidate\'s facts '
            .'intact, and never invent metrics that are not already present. Keep it under '
            .'30 words. Reply with JSON: {"improved": "<rewritten bullet>"}.';

        $attempted = $this->withRetry('enhanceBullet', fn () => $this->chatJson(
            $system,
            Str::limit($trimmed, 500),
            (int) config('groq.max_tokens.enhance_bullet', 512),
            0.7,
        ));

        if (! $attempted->ok) {
            $this->logFallback('enhanceBullet', 'all retries failed', ['error' => $attempted->error]);
            return AiResult::fallback($this->ruleBasedEnhance($trimmed));
        }

        $improved = is_array($attempted->value) ? ($attempted->value['improved'] ?? null) : null;
        $improved = is_string($improved) ? trim($improved) : '';
        if ($improved === '') {
            $this->logFallback('enhanceBullet', 'empty model output');
            return AiResult::fallback($this->ruleBasedEnhance($trimmed));
        }

        return AiResult::ai($improved);
    }

    /**
     * Generate a professional summary paragraph from extracted skills + role.
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

        $system = 'You write resume summaries. Produce exactly 2 sentences, written in the '
            .'third person without pronouns, concrete and free of cliches. Do not invent '
            .'employers, metrics or credentials beyond what is given. '
            .'Reply with JSON: {"summary": "<the two sentences>"}.';

        $user = sprintf(
            'Role: %s. Years of experience: %d. Key skills: %s.',
            $role !== '' ? $role : 'professional',
            $experienceYears,
            implode(', ', $topSkills),
        );

        $attempted = $this->withRetry('generateSummary', fn () => $this->chatJson(
            $system,
            $user,
            (int) config('groq.max_tokens.generate_summary', 768),
            0.7,
        ));

        if (! $attempted->ok) {
            $this->logFallback('generateSummary', 'all retries failed', ['error' => $attempted->error]);
            return AiResult::fallback($this->templateSummary($role, $topSkills, $experienceYears));
        }

        $summary = is_array($attempted->value) ? ($attempted->value['summary'] ?? null) : null;
        $summary = is_string($summary) ? trim($summary) : '';
        if ($summary === '') {
            $this->logFallback('generateSummary', 'empty model output');
            return AiResult::fallback($this->templateSummary($role, $topSkills, $experienceYears));
        }

        return AiResult::ai($summary);
    }

    /**
     * Turn raw resume text into the structured content the builder renders.
     * Fallback: heuristic section parse (AiFallbacks::heuristicResumeContent).
     *
     * @return AiResult<array<string, mixed>>
     */
    public function extractResumeContent(string $text): AiResult
    {
        $trimmed = trim($text);
        if ($trimmed === '') {
            return AiResult::fallback($this->heuristicResumeContent(''));
        }
        if (! $this->hasKey) {
            $this->logFallback('extractResumeContent', 'no API key configured');
            return AiResult::fallback($this->heuristicResumeContent($trimmed));
        }

        $system = 'You convert raw resume text into structured JSON. Reply with a JSON object '
            .'with exactly these keys: "contact", "summary", "experience", "education", '
            .'"projects", "certifications".'."\n"
            .'"contact": {"name","email","phone","location","website","linkedin","github"} — strings, "" when absent.'."\n"
            .'"summary": a 2-3 sentence professional summary drawn from the resume.'."\n"
            .'"experience": array of {"company","position","startDate","endDate","description","bullets"} '
            .'where bullets is an array of achievement strings.'."\n"
            .'"education": array of {"institution","degree","field","startDate","endDate","gpa"}.'."\n"
            .'"projects": array of {"name","description","url","technologies"} where technologies is an array.'."\n"
            .'"certifications": array of {"name","issuer","date"}.'."\n"
            .'Copy dates exactly as written in the resume. Never invent employers, dates, '
            .'schools or metrics that are not in the text. Use an empty array for a section '
            .'the resume does not contain.';

        $attempted = $this->withRetry('extractResumeContent', fn () => $this->chatJson(
            $system,
            Str::limit($trimmed, $this->maxInputChars),
            (int) config('groq.max_tokens.extract_resume_content', 6144),
        ));

        if (! $attempted->ok) {
            $this->logFallback('extractResumeContent', 'all retries failed', ['error' => $attempted->error]);
            return AiResult::fallback($this->heuristicResumeContent($trimmed));
        }

        $parsed = $this->normalizeResumeContent(is_array($attempted->value) ? $attempted->value : []);

        // If the model gave us nothing usable, the heuristic parse is a better
        // starting point than an empty form.
        $isEmpty = $parsed['summary'] === ''
            && empty($parsed['experience'])
            && empty($parsed['education'])
            && empty($parsed['projects'])
            && empty($parsed['certifications']);
        if ($isEmpty) {
            $this->logFallback('extractResumeContent', 'model returned no usable sections');
            return AiResult::fallback($this->heuristicResumeContent($trimmed));
        }

        return AiResult::ai($parsed);
    }

    // ---------- internals ----------

    /**
     * Coerce the model's JSON into exactly the shape the content schema allows,
     * clamping every field to the length the validator accepts.
     *
     * @param array<string, mixed> $raw
     * @return array<string, mixed>
     */
    private function normalizeResumeContent(array $raw): array
    {
        $str = fn ($v, int $max): string => is_scalar($v) ? mb_substr(trim((string) $v), 0, $max) : '';
        /** @var callable(mixed): list<array<string, mixed>> $rows */
        $rows = fn ($v): array => is_array($v) ? array_values(array_filter($v, 'is_array')) : [];
        $strList = fn ($v, int $max, int $limit): array => is_array($v)
            ? array_values(array_slice(array_filter(array_map(
                fn ($i) => is_scalar($i) ? mb_substr(trim((string) $i), 0, $max) : '',
                $v,
            ), fn ($i) => $i !== ''), 0, $limit))
            : [];

        $contact = is_array($raw['contact'] ?? null) ? $raw['contact'] : [];

        return [
            'contact' => [
                'name' => $str($contact['name'] ?? '', 120),
                'email' => $str($contact['email'] ?? '', 160),
                'phone' => $str($contact['phone'] ?? '', 40),
                'location' => $str($contact['location'] ?? '', 120),
                'website' => $str($contact['website'] ?? '', 200),
                'linkedin' => $str($contact['linkedin'] ?? '', 200),
                'github' => $str($contact['github'] ?? '', 200),
            ],
            'summary' => $str($raw['summary'] ?? '', 600),
            'experience' => array_slice(array_map(fn (array $e) => [
                'company' => $str($e['company'] ?? '', 160),
                'position' => $str($e['position'] ?? '', 160),
                'startDate' => $str($e['startDate'] ?? '', 40),
                'endDate' => $str($e['endDate'] ?? '', 40),
                'description' => $str($e['description'] ?? '', 600),
                'bullets' => $strList($e['bullets'] ?? [], 400, 12),
            ], $rows($raw['experience'] ?? [])), 0, 15),
            'education' => array_slice(array_map(fn (array $e) => [
                'institution' => $str($e['institution'] ?? '', 160),
                'degree' => $str($e['degree'] ?? '', 120),
                'field' => $str($e['field'] ?? '', 120),
                'startDate' => $str($e['startDate'] ?? '', 40),
                'endDate' => $str($e['endDate'] ?? '', 40),
                'gpa' => $str($e['gpa'] ?? '', 20),
            ], $rows($raw['education'] ?? [])), 0, 10),
            'projects' => array_slice(array_map(fn (array $p) => [
                'name' => $str($p['name'] ?? '', 160),
                'description' => $str($p['description'] ?? '', 600),
                'url' => $str($p['url'] ?? '', 200),
                'technologies' => $strList($p['technologies'] ?? [], 60, 20),
            ], $rows($raw['projects'] ?? [])), 0, 15),
            'certifications' => array_slice(array_map(fn (array $c) => [
                'name' => $str($c['name'] ?? '', 160),
                'issuer' => $str($c['issuer'] ?? '', 160),
                'date' => $str($c['date'] ?? '', 40),
            ], $rows($raw['certifications'] ?? [])), 0, 20),
        ];
    }

    /**
     * One chat-completion call returning the decoded JSON object.
     *
     * @return array<string, mixed>
     */
    private function chatJson(string $system, string $user, int $maxTokens, float $temperature = 0.0): array
    {
        $body = [
            'model' => $this->model,
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $user],
            ],
            'temperature' => $temperature,
            'max_tokens' => $maxTokens,
            // Constrains the model to emit a single JSON object. Requires the
            // word "JSON" in the prompt, which every system prompt above has.
            'response_format' => ['type' => 'json_object'],
        ];

        if ($this->supportsReasoningEffort()) {
            $body['reasoning_effort'] = (string) config('groq.reasoning_effort', 'low');
        }

        $response = $this->client->post('chat/completions', ['json' => $body]);
        $decoded = json_decode((string) $response->getBody(), true) ?? [];
        $content = $decoded['choices'][0]['message']['content'] ?? '';
        $content = is_string($content) ? trim($content) : '';

        if ($content === '') {
            throw new \RuntimeException('Groq returned an empty completion');
        }

        $parsed = json_decode($content, true);
        if (! is_array($parsed)) {
            throw new \RuntimeException('Groq returned malformed JSON: '.Str::limit($content, 200));
        }

        return $parsed;
    }

    /**
     * Reasoning models accept `reasoning_effort`; sending it to a model that
     * does not support it is rejected, so it is gated on the model id.
     */
    private function supportsReasoningEffort(): bool
    {
        return (bool) preg_match('/gpt-oss|qwen3|deepseek-r1/i', $this->model);
    }

    /**
     * Retry transport failures, rate limits and 5xx. A 400/401/403/404 will
     * never succeed (malformed request, bad key, retired model id), so those
     * break out immediately rather than burning the full backoff budget.
     *
     * @param callable(): mixed $fn
     */
    private function withRetry(string $op, callable $fn): RetryResult
    {
        $lastError = '';
        for ($attempt = 1; $attempt <= $this->retryAttempts; $attempt++) {
            try {
                return RetryResult::ok($fn());
            } catch (GuzzleException|\Throwable $e) {
                $lastError = $e->getMessage();
                $isLast = $attempt === $this->retryAttempts || ! $this->isRetryable($e);
                // On a rate limit the provider tells us exactly how long to
                // wait; guessing with exponential backoff either gives up too
                // early or sleeps longer than necessary.
                $delayMs = $this->retryAfterMs($e)
                    ?? (int) ($this->retryBaseDelayMs * pow(2, $attempt - 1));
                $this->logFallback($op, "attempt {$attempt} failed", [
                    'error' => $lastError,
                    'willRetry' => ! $isLast,
                    'nextDelayMs' => $isLast ? null : $delayMs,
                ]);
                if ($isLast) {
                    break;
                }
                usleep($delayMs * 1000);
            }
        }
        return RetryResult::fail($lastError);
    }

    /**
     * Wait hinted by the provider's `Retry-After` header, in milliseconds.
     * Returns null when there is no usable hint.
     */
    private function retryAfterMs(\Throwable $e): ?int
    {
        if (! $e instanceof ClientException) {
            return null;
        }
        $header = $e->getResponse()->getHeaderLine('Retry-After');
        if ($header === '' || ! is_numeric($header)) {
            return null;
        }

        // Never sleep longer than the request timeout — falling back is better
        // than blocking a queue worker for minutes on one job.
        return (int) min((float) $header * 1000, 30_000);
    }

    private function isRetryable(\Throwable $e): bool
    {
        if ($e instanceof ClientException) {
            $status = $e->getResponse()->getStatusCode();
            return $status === 408 || $status === 429;
        }
        // Server errors, connection failures, timeouts and parse errors.
        return true;
    }

    /**
     * @param list<string> $values
     */
    private function quotedList(array $values): string
    {
        return implode(', ', array_map(fn ($v) => '"'.$v.'"', $values));
    }
}
