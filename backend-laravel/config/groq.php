<?php

/**
 * Groq configuration.
 *
 * Groq exposes an OpenAI-compatible chat-completions API — there are no task
 * pipelines (no NER, no cross-encoder, no zero-shot) and no embeddings
 * endpoint, so GroqService expresses every operation as a prompt returning JSON.
 *
 * Empty GROQ_API_KEY => every call short-circuits to the deterministic fallback
 * (no network attempt is made), exactly like the Hugging Face path.
 */
return [
    'api_key' => env('GROQ_API_KEY', ''),
    'endpoint' => env('GROQ_ENDPOINT') ?: 'https://api.groq.com/openai/v1',
    'timeout' => (int) env('GROQ_TIMEOUT', 30),

    /*
     * Groq retires model ids periodically. If calls start failing with a 404,
     * set GROQ_MODEL to a current id — no code change needed.
     * List what your key can reach: GET https://api.groq.com/openai/v1/models
     */
    'model' => env('GROQ_MODEL') ?: 'openai/gpt-oss-120b',

    /*
     * Reasoning models spend completion tokens on internal reasoning before the
     * visible answer. "low" keeps latency and token spend down for these short
     * structured tasks. Only sent for models that accept the parameter.
     */
    'reasoning_effort' => env('GROQ_REASONING_EFFORT') ?: 'low',

    'retry' => [
        'attempts' => (int) env('GROQ_RETRY_ATTEMPTS', 3),
        'base_delay_ms' => (int) env('GROQ_RETRY_BASE_DELAY_MS', 2000),
    ],

    /* Resume/job text is truncated to this before being sent. */
    'max_input_chars' => (int) env('GROQ_MAX_INPUT_CHARS', 12000),

    /*
     * Token budget per operation. Must cover reasoning tokens too — a budget
     * that is too small is spent entirely on reasoning and the completion comes
     * back empty, which JSON mode then rejects with `json_validate_failed`.
     */
    'max_tokens' => [
        'extract_skills' => 3072,
        'match_resume_to_job' => 512,
        'categorize_skill' => 256,
        'enhance_bullet' => 512,
        'generate_summary' => 768,
        'extract_resume_content' => 6144,
    ],
];
