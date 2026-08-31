<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\Log;

/**
 * Deterministic fallback implementations shared by every AI provider (§3).
 *
 * These run whenever the AI path is unavailable, so the degraded behaviour is
 * identical no matter which provider is configured.
 */
trait AiFallbacks
{
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

    /**
     * Heuristic resume parse used when no AI provider is available.
     *
     * Splits the text on common section headings and keeps the raw lines, which
     * is far less accurate than the AI path but still gives the user something
     * to edit instead of an empty form. Contact details are picked out with
     * plain patterns (email, phone, URLs).
     *
     * @return array{contact: array<string, string>, summary: string, experience: list<array<string, mixed>>, education: list<array<string, mixed>>, projects: list<array<string, mixed>>, certifications: list<array<string, mixed>>}
     */
    public function heuristicResumeContent(string $text): array
    {
        $lines = preg_split('/\R/', $text) ?: [];
        $lines = array_values(array_filter(array_map('trim', $lines), fn ($l) => $l !== ''));

        $sections = $this->splitSections($lines);

        return [
            'contact' => $this->contactFromText($text, $lines),
            'summary' => $this->joinLines($sections['summary'] ?? [], 600),
            'experience' => $this->itemsFromLines($sections['experience'] ?? [], 'experience'),
            'education' => $this->itemsFromLines($sections['education'] ?? [], 'education'),
            'projects' => $this->itemsFromLines($sections['projects'] ?? [], 'projects'),
            'certifications' => array_map(
                fn (string $l) => ['name' => mb_substr($l, 0, 160), 'issuer' => '', 'date' => ''],
                array_slice($sections['certifications'] ?? [], 0, 20),
            ),
        ];
    }

    /**
     * @param list<string> $lines
     * @return array<string, list<string>>
     */
    private function splitSections(array $lines): array
    {
        $patterns = [
            'summary' => '/^(professional\s+)?(summary|profile|objective|about( me)?)\b/i',
            'experience' => '/^(work\s+|professional\s+|employment\s+)?(experience|history)\b/i',
            'education' => '/^(education|academic|qualifications)\b/i',
            'projects' => '/^(projects?|portfolio)\b/i',
            'certifications' => '/^(certifications?|licenses?|awards?)\b/i',
            'skills' => '/^(technical\s+)?(skills|technologies|competenc)/i',
        ];

        $sections = [];
        $current = null;
        foreach ($lines as $line) {
            $heading = null;
            // Headings are short lines — a long sentence that happens to start
            // with "Experience" is body text, not a section title.
            if (mb_strlen($line) <= 60) {
                foreach ($patterns as $name => $pattern) {
                    if (preg_match($pattern, $line)) {
                        $heading = $name;
                        break;
                    }
                }
            }
            if ($heading !== null) {
                $current = $heading;
                $sections[$current] ??= [];
                continue;
            }
            if ($current !== null) {
                $sections[$current][] = $line;
            }
        }

        return $sections;
    }

    /**
     * @param list<string> $lines
     * @return list<array<string, mixed>>
     */
    private function itemsFromLines(array $lines, string $kind): array
    {
        if (empty($lines)) {
            return [];
        }

        // Without reliable structure, keep one entry holding the raw lines so
        // nothing from the resume is silently dropped.
        $body = $this->joinLines($lines, 600);
        if ($body === '') {
            return [];
        }

        return match ($kind) {
            'education' => [[
                'institution' => mb_substr($lines[0], 0, 160),
                'degree' => '',
                'field' => '',
                'startDate' => '',
                'endDate' => '',
                'gpa' => '',
            ]],
            'projects' => [[
                'name' => mb_substr($lines[0], 0, 160),
                'description' => $body,
                'url' => '',
                'technologies' => [],
            ]],
            default => [[
                'company' => '',
                'position' => mb_substr($lines[0], 0, 160),
                'startDate' => '',
                'endDate' => '',
                'description' => $body,
                'bullets' => array_values(array_map(
                    fn (string $l) => mb_substr(ltrim($l, "-*\u{2022} \t"), 0, 400),
                    array_slice(array_filter($lines, fn ($l) => preg_match('/^[-*\x{2022}]/u', $l)), 0, 10),
                )),
            ]],
        };
    }

    /**
     * @param list<string> $lines
     */
    private function joinLines(array $lines, int $max): string
    {
        return mb_substr(trim(implode(' ', $lines)), 0, $max);
    }

    /**
     * @param list<string> $lines
     * @return array<string, string>
     */
    private function contactFromText(string $text, array $lines): array
    {
        preg_match('/[\w.+-]+@[\w-]+\.[\w.-]+/', $text, $email);
        preg_match('/(\+?\d[\d\s\-().]{7,}\d)/', $text, $phone);
        preg_match('#(https?://)?(www\.)?linkedin\.com/[\w\-/]+#i', $text, $linkedin);
        preg_match('#(https?://)?(www\.)?github\.com/[\w\-/]+#i', $text, $github);

        // The name is usually the first non-empty line of a resume.
        $name = '';
        foreach ($lines as $line) {
            if (mb_strlen($line) <= 60 && ! str_contains($line, '@') && preg_match('/^[\p{L}][\p{L}\s.\'\-]+$/u', $line)) {
                $name = $line;
                break;
            }
        }

        return [
            'name' => mb_substr($name, 0, 120),
            'email' => mb_substr($email[0] ?? '', 0, 160),
            'phone' => mb_substr(trim($phone[1] ?? ''), 0, 40),
            'location' => '',
            'website' => '',
            'linkedin' => mb_substr($linkedin[0] ?? '', 0, 200),
            'github' => mb_substr($github[0] ?? '', 0, 200),
        ];
    }

    protected function logFallback(string $operation, string $reason, array $extra = []): void
    {
        Log::warning(json_encode(array_merge([
            'level' => 'warn',
            'event' => 'ai_fallback',
            'operation' => $operation,
            'reason' => $reason,
        ], $extra)));
    }

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
}
