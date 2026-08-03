<?php

/**
 * Hugging Face model registry (§3 fallback table).
 *
 * Each entry pairs an AI model ID with its deterministic fallback. The
 * HuggingFaceService reads this config to know which endpoint to hit.
 *
 * Empty HUGGINGFACE_API_KEY => every call short-circuits to the fallback
 * (no network attempt is made). This is the sandbox default.
 */
return [
    'api_key' => env('HUGGINGFACE_API_KEY', ''),
    'endpoint' => env('HUGGINGFACE_INFERENCE_ENDPOINT', 'https://api-inference.huggingface.co'),
    'timeout' => (int) env('HUGGINGFACE_TIMEOUT', 30),
    'retry' => [
        'attempts' => (int) env('HUGGINGFACE_RETRY_ATTEMPTS', 3),
        'base_delay_ms' => (int) env('HUGGINGFACE_RETRY_BASE_DELAY_MS', 2000),
    ],
    'cache_ttl_seconds' => (int) env('AI_CACHE_TTL_SECONDS', 604800), // 7 days
    'max_input_chars' => 4000,
    'models' => [
        // NER for skill extraction.
        'ner_skills' => env('HF_MODEL_NER_SKILLS', 'dslim/bert-base-NER'),
        // Cross-encoder for resume↔job semantic similarity.
        'cross_encoder' => env('HF_MODEL_CROSS_ENCODER', 'cross-encoder/ms-marco-MiniLM-L-6-v2'),
        // Zero-shot classifier for skill categorization.
        'zero_shot_classify' => env('HF_MODEL_ZERO_SHOT', 'facebook/bart-large-mnli'),
        // Text generation for resume enhancement + tailoring.
        'text_generation' => env('HF_MODEL_TEXT_GEN', 'google/flan-t5-base'),
    ],
    'fallbacks' => [
        'extract_skills' => 'dictionary',         // SkillsDictionary::extract()
        'match_resume_to_job' => 'tfidf_cosine',  // HuggingFaceService::tfidfCosine()
        'categorize_skill' => 'static_lookup',    // SkillsDictionary::categorize()
        'enhance_bullet' => 'rule_based',         // HuggingFaceService::ruleBasedEnhance()
        'generate_summary' => 'template',         // HuggingFaceService::templateSummary()
    ],
];
