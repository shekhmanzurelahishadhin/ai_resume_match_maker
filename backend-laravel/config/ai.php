<?php

/**
 * AI provider selection.
 *
 * Resolution order, first configured wins:
 *   1. GROQ_API_KEY        => GroqService (chat-completions, best quality)
 *   2. HUGGINGFACE_API_KEY => HuggingFaceService (task pipelines)
 *   3. neither             => HuggingFaceService with no key, i.e. every call
 *                             takes the deterministic fallback path
 *
 * Set AI_PROVIDER=groq|huggingface to pin one explicitly and skip auto-detection.
 */
return [
    'provider' => env('AI_PROVIDER', ''),

    /*
     * Matching cost control.
     *
     * Scoring every resume/job pair with the AI does not scale: with 100 active
     * jobs that is 100 sequential calls per upload (~8 minutes, and enough
     * volume to hit provider rate limits, which then degrades the results to
     * the fallback anyway).
     *
     * Instead every pair is first scored with the free TF-IDF + skills-overlap
     * formula, and only the strongest `ai_candidates` get a real AI call. The
     * rest keep their deterministic score.
     */
    'match' => [
        'ai_candidates' => (int) env('AI_MATCH_CANDIDATES', 20),
        // Pairs scoring below this are not worth an AI call at any rank.
        'min_score' => (float) env('AI_MATCH_MIN_SCORE', 0.02),
    ],
];
