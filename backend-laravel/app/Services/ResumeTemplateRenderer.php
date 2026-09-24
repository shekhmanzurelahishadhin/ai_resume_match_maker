<?php

namespace App\Services;

use App\Models\GeneratedResume;
use App\Models\ResumeTemplate;
use Barryvdh\DomPDF\PDF;
use Illuminate\Support\Facades\View;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\Settings;

/**
 * Resume template renderer (§6).
 *
 * Renders a GeneratedResume's content_json into 3 formats:
 *   - HTML — Blade view at resources/views/resume-templates/{slug}.blade.php
 *   - PDF  — the same HTML → laravel-dompdf
 *   - DOCX — phpword (content-accurate, layout-approximate per §6 caveat)
 *
 * Each template is its own structural layout (single column, sidebar, header
 * band, timeline …) composed from shared section partials. On top of any
 * template the user can apply a theme: two colours, heading/body fonts,
 * spacing and text size.
 *
 * Layouts are built with tables rather than flexbox/grid because dompdf does
 * not support either; the same markup then looks the same on screen and in
 * the exported PDF.
 */
class ResumeTemplateRenderer
{
    public const FORMATS = ['html', 'pdf', 'docx'];

    /**
     * Template registry: structural defaults for every renderable slug.
     *
     * `font` values are keys of FONTS. Colours are only defaults — the user's
     * theme overrides them.
     */
    public const TEMPLATES = [
        'modern-clean' => [
            'name' => 'Modern Clean',
            'description' => 'Single column with a crisp accent bar and skill chips — a safe default for most roles.',
            'primary' => '#059669', 'accent' => '#34d399',
            'headingFont' => 'modern', 'bodyFont' => 'modern',
        ],
        'professional-classic' => [
            'name' => 'Professional Classic',
            'description' => 'Traditional serif with a tinted sidebar for contact details, skills and education.',
            'primary' => '#1e3a5f', 'accent' => '#3b82f6',
            'headingFont' => 'serif', 'bodyFont' => 'serif',
        ],
        'creative' => [
            'name' => 'Creative',
            'description' => 'Full-width colour header band and bold accents for design and marketing roles.',
            'primary' => '#7e22ce', 'accent' => '#ec4899',
            'headingFont' => 'sans', 'bodyFont' => 'sans',
        ],
        'executive' => [
            'name' => 'Executive',
            'description' => 'Centred serif header, a boxed profile up top and a dense layout for senior roles.',
            'primary' => '#0f172a', 'accent' => '#b45309',
            'headingFont' => 'serif', 'bodyFont' => 'sans',
        ],
        'technical' => [
            'name' => 'Technical',
            'description' => 'Skills matrix first and monospace accents — built for engineering resumes.',
            'primary' => '#0e7490', 'accent' => '#22d3ee',
            'headingFont' => 'mono', 'bodyFont' => 'sans',
        ],
        'academic' => [
            'name' => 'Academic',
            'description' => 'Centred serif header with education first, suited to research and teaching.',
            'primary' => '#1f2937', 'accent' => '#6b7280',
            'headingFont' => 'serif', 'bodyFont' => 'serif',
        ],
        'minimal' => [
            'name' => 'Minimal',
            'description' => 'Generous whitespace with dates in a left-hand timeline column.',
            'primary' => '#111827', 'accent' => '#9ca3af',
            'headingFont' => 'sans', 'bodyFont' => 'sans',
        ],
        'bold-sidebar' => [
            'name' => 'Bold Sidebar',
            'description' => 'Solid colour sidebar holding name, contact and skills beside the main story.',
            'primary' => '#1d4ed8', 'accent' => '#93c5fd',
            'headingFont' => 'modern', 'bodyFont' => 'modern',
        ],
    ];

    /**
     * Font stacks the user can choose from.
     *
     * Every stack ends in a family dompdf ships with (Helvetica, Times,
     * Courier), so an exported PDF falls back predictably instead of to a
     * default font. `docx` is the closest Word font.
     */
    public const FONTS = [
        'sans' => [
            'label' => 'Sans',
            'css' => "'Helvetica Neue', Helvetica, Arial, sans-serif",
            'docx' => 'Arial',
        ],
        'modern' => [
            'label' => 'Modern',
            'css' => "'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif",
            'docx' => 'Calibri',
        ],
        'serif' => [
            'label' => 'Serif',
            'css' => "Georgia, 'Times New Roman', Times, serif",
            'docx' => 'Georgia',
        ],
        'mono' => [
            'label' => 'Mono',
            'css' => "'JetBrains Mono', Consolas, 'Courier New', Courier, monospace",
            'docx' => 'Consolas',
        ],
    ];

    public const SPACINGS = ['compact', 'normal', 'relaxed'];

    public const FONT_SIZES = ['small', 'medium', 'large'];

    /**
     * The list of slugs this renderer knows how to render.
     *
     * @return list<string>
     */
    public static function knownSlugs(): array
    {
        return array_keys(self::TEMPLATES);
    }

    /**
     * Validation rules for a request's `customizationJson`.
     *
     * The renderer ignores anything outside these lists anyway (see
     * resolveTheme), but rejecting it up front gives the client a clear 422
     * instead of a silently ignored setting.
     *
     * @return array<string, list<string>>
     */
    public static function customizationRules(): array
    {
        return [
            'customizationJson' => ['sometimes', 'array'],
            'customizationJson.primaryColor' => ['sometimes', 'nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'customizationJson.accentColor' => ['sometimes', 'nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'customizationJson.headingFont' => ['sometimes', 'nullable', 'in:'.implode(',', array_keys(self::FONTS))],
            'customizationJson.bodyFont' => ['sometimes', 'nullable', 'in:'.implode(',', array_keys(self::FONTS))],
            'customizationJson.spacing' => ['sometimes', 'nullable', 'in:'.implode(',', self::SPACINGS)],
            'customizationJson.fontSize' => ['sometimes', 'nullable', 'in:'.implode(',', self::FONT_SIZES)],
        ];
    }

    public function isRenderable(ResumeTemplate|string $templateOrSlug): bool
    {
        $slug = $templateOrSlug instanceof ResumeTemplate ? $templateOrSlug->slug : $templateOrSlug;

        return array_key_exists($slug, self::TEMPLATES);
    }

    /**
     * Render the resume content to a full HTML document.
     *
     * @param array $content       the structured content_json
     * @param array $customization the user's theme overrides
     */
    public function renderHtml(ResumeTemplate $template, array $content, array $customization = []): string
    {
        return $this->renderSlug($template->slug, $content, $customization);
    }

    /**
     * Render a template by slug. Used for resumes and for template thumbnails.
     */
    public function renderSlug(string $slug, array $content, array $customization = [], bool $forPdf = false): string
    {
        if (! $this->isRenderable($slug)) {
            throw new \InvalidArgumentException("Template '{$slug}' has no renderer");
        }

        return View::make("resume-templates.{$slug}", [
            'content' => $this->normalizeContent($content),
            'theme' => $this->resolveTheme($slug, $customization) + ['pdf' => $forPdf],
        ])->render();
    }

    /**
     * Render a template filled with sample content — for picker thumbnails.
     */
    public function renderSample(string $slug, array $customization = []): string
    {
        return $this->renderSlug($slug, $this->sampleContent(), $customization);
    }

    /**
     * Render the resume to PDF (HTML → dompdf).
     */
    public function renderPdf(GeneratedResume $resume): string
    {
        // PDF mode moves the page padding into @page margins so that content
        // flowing onto page 2 keeps a top margin too.
        $html = $this->renderSlug(
            $resume->template->slug,
            $resume->content_json ?? [],
            $resume->customization_json ?? [],
            forPdf: true,
        );
        /** @var PDF $pdf */
        $pdf = app('dompdf.wrapper');
        $pdf->setPaper('a4');
        $pdf->loadHTML($html);

        return $pdf->output();
    }

    /**
     * Render the resume to DOCX via phpword.
     *
     * Per §6: content-accurate, layout-approximate. Word has no CSS, so the
     * structure (headings, lists) is preserved and the theme's primary colour
     * and fonts are applied, but the template's layout is not reproduced.
     */
    public function renderDocx(GeneratedResume $resume): string
    {
        // PhpWord writes text into the XML verbatim unless escaping is on, so a
        // plain "R&D" produced a DOCX that Word refused to open. Control
        // characters (common in text extracted from PDFs) are invalid in XML
        // even when escaped, so they are stripped first.
        Settings::setOutputEscapingEnabled(true);
        $content = self::stripXmlInvalidChars($this->normalizeContent($resume->content_json ?? []));
        $theme = $this->resolveTheme($resume->template?->slug ?? 'modern-clean', $resume->customization_json ?? []);
        $primary = ltrim($theme['primary'], '#');
        $headingFont = self::FONTS[$theme['headingFontKey']]['docx'];

        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName(self::FONTS[$theme['bodyFontKey']]['docx']);
        $phpWord->setDefaultFontSize(match ($theme['fontSize']) {
            'small' => 10,
            'large' => 12,
            default => 11,
        });

        $section = $phpWord->addSection();

        // Name + contact.
        $contact = $content['contact'];
        if (! empty($contact['name'])) {
            $section->addText($contact['name'], ['bold' => true, 'size' => 24, 'name' => $headingFont, 'color' => $primary]);
        }
        $contactLine = implode(' · ', array_filter([
            $contact['email'] ?? '',
            $contact['phone'] ?? '',
            $contact['location'] ?? '',
            $contact['website'] ?? '',
            $contact['linkedin'] ?? '',
            $contact['github'] ?? '',
        ]));
        if ($contactLine !== '') {
            $section->addText($contactLine, ['size' => 9, 'color' => '555555']);
        }

        $heading = fn (string $title) => $this->addSection($section, $title, $primary, $headingFont);

        if ($content['summary'] !== '') {
            $heading('Summary');
            $section->addText($content['summary']);
        }

        if (! empty($content['experience'])) {
            $heading('Experience');
            foreach ($content['experience'] as $exp) {
                $section->addText($exp['position'] ?? '', ['bold' => true]);
                $meta = implode(' · ', array_filter([
                    $exp['company'],
                    $exp['dates'],
                ]));
                if ($meta !== '') {
                    $section->addText($meta, ['italic' => true, 'size' => 10, 'color' => '555555']);
                }
                if (! empty($exp['description'])) {
                    $section->addText($exp['description']);
                }
                foreach ($exp['bullets'] ?? [] as $b) {
                    $section->addListItem($b);
                }
            }
        }

        if (! empty($content['education'])) {
            $heading('Education');
            foreach ($content['education'] as $edu) {
                $section->addText($edu['institution'] ?? '', ['bold' => true]);
                $line = implode(' · ', array_filter([
                    trim($edu['degree'].' '.$edu['field']),
                    $edu['dates'],
                    $edu['gpa'] !== '' ? 'GPA '.$edu['gpa'] : '',
                ]));
                if ($line !== '') {
                    $section->addText($line, ['italic' => true, 'size' => 10]);
                }
            }
        }

        if (! empty($content['skills'])) {
            $heading('Skills');
            foreach ($content['skills'] as $group) {
                $label = $group['category'] !== '' ? $group['category'].': ' : '';
                $section->addText($label.implode(', ', $group['items']), ['size' => 10]);
            }
        }

        if (! empty($content['projects'])) {
            $heading('Projects');
            foreach ($content['projects'] as $proj) {
                $section->addText($proj['name'] ?? '', ['bold' => true]);
                if (! empty($proj['description'])) {
                    $section->addText($proj['description']);
                }
                if (! empty($proj['technologies'])) {
                    $section->addText('Tech: '.implode(', ', $proj['technologies']), ['italic' => true, 'size' => 10]);
                }
            }
        }

        if (! empty($content['certifications'])) {
            $heading('Certifications');
            foreach ($content['certifications'] as $cert) {
                $section->addListItem(implode(' · ', array_filter([
                    $cert['name'] ?? '', $cert['issuer'] ?? '', $cert['date'] ?? '',
                ])));
            }
        }

        $base = tempnam(sys_get_temp_dir(), 'rm_docx_');
        $tmpFile = $base.'.docx';
        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tmpFile);
        $bytes = (string) file_get_contents($tmpFile);
        @unlink($tmpFile);
        @unlink($base);

        return $bytes;
    }

    /**
     * Remove characters XML 1.0 does not allow (C0 controls other than tab,
     * newline and carriage return), recursively.
     */
    private static function stripXmlInvalidChars(mixed $value): mixed
    {
        if (is_string($value)) {
            return preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', $value) ?? '';
        }
        if (is_array($value)) {
            return array_map([self::class, 'stripXmlInvalidChars'], $value);
        }

        return $value;
    }

    /**
     * The DOCX caveat string returned by the export endpoint.
     */
    public function docxCaveat(): string
    {
        return 'content-accurate, layout-approximate';
    }

    /**
     * Theme after merging the user's customisation over the template defaults.
     *
     * Every value ends up inside a <style> block, so nothing user-supplied is
     * passed through: colours must be 6-digit hex, fonts are looked up by key,
     * spacing and size come from fixed lists. Anything else falls back to the
     * template default.
     *
     * @return array<string, string>
     */
    public function resolveTheme(string $slug, array $customization = []): array
    {
        $defaults = self::TEMPLATES[$slug] ?? self::TEMPLATES['modern-clean'];

        $primary = $this->hexOr($customization['primaryColor'] ?? null, $defaults['primary']);
        $accent = $this->hexOr($customization['accentColor'] ?? null, $defaults['accent']);
        $headingKey = $this->fontKeyOr($customization['headingFont'] ?? null, $defaults['headingFont']);
        $bodyKey = $this->fontKeyOr($customization['bodyFont'] ?? null, $defaults['bodyFont']);
        $spacing = in_array($customization['spacing'] ?? null, self::SPACINGS, true)
            ? $customization['spacing'] : 'normal';
        $fontSize = in_array($customization['fontSize'] ?? null, self::FONT_SIZES, true)
            ? $customization['fontSize'] : 'medium';

        return [
            'primary' => $primary,
            'accent' => $accent,
            // Light wash of the primary colour for sidebars and chips. Mixed in
            // PHP because dompdf's rgba() support is unreliable.
            'tint' => $this->mix($primary, '#ffffff', 0.9),
            'tintStrong' => $this->mix($primary, '#ffffff', 0.78),
            // Text colour that stays readable on a primary-coloured background.
            'onPrimary' => $this->luminance($primary) > 0.55 ? '#111827' : '#ffffff',
            'onPrimaryMuted' => $this->luminance($primary) > 0.55 ? '#374151' : $this->mix($primary, '#ffffff', 0.78),
            'text' => '#1f2937',
            'muted' => '#4b5563',
            'faint' => '#6b7280',
            'rule' => '#e5e7eb',
            'headingFont' => self::FONTS[$headingKey]['css'],
            'bodyFont' => self::FONTS[$bodyKey]['css'],
            'headingFontKey' => $headingKey,
            'bodyFontKey' => $bodyKey,
            'spacing' => $spacing,
            'fontSize' => $fontSize,
            'baseSize' => match ($fontSize) {
                'small' => '11.5px',
                'large' => '13.5px',
                default => '12.5px',
            },
            'pagePad' => match ($spacing) {
                'compact' => '26px',
                'relaxed' => '52px',
                default => '38px',
            },
            'sectionGap' => match ($spacing) {
                'compact' => '12px',
                'relaxed' => '26px',
                default => '18px',
            },
            'itemGap' => match ($spacing) {
                'compact' => '7px',
                'relaxed' => '14px',
                default => '10px',
            },
        ];
    }

    // ---------- content ----------

    /**
     * Normalise content_json into the shape the templates rely on: every key
     * present, every list a list of arrays, and every link either a safe
     * http(s) URL or dropped.
     */
    private function normalizeContent(array $content): array
    {
        $str = fn ($v): string => is_scalar($v) ? trim((string) $v) : '';
        $rows = fn ($v): array => is_array($v) ? array_values(array_filter($v, 'is_array')) : [];
        $list = fn ($v): array => is_array($v)
            ? array_values(array_filter(array_map($str, $v), fn ($s) => $s !== ''))
            : [];

        $contact = is_array($content['contact'] ?? null) ? $content['contact'] : [];
        $website = $this->safeUrl($str($contact['website'] ?? ''));
        $linkedin = $this->safeUrl($str($contact['linkedin'] ?? ''));
        $github = $this->safeUrl($str($contact['github'] ?? ''));

        return [
            'contact' => [
                'name' => $str($contact['name'] ?? ''),
                'email' => $str($contact['email'] ?? ''),
                'phone' => $str($contact['phone'] ?? ''),
                'location' => $str($contact['location'] ?? ''),
                'website' => $website,
                'websiteLabel' => $this->displayUrl($website),
                'linkedin' => $linkedin,
                'linkedinLabel' => $this->displayUrl($linkedin),
                'github' => $github,
                'githubLabel' => $this->displayUrl($github),
            ],
            'summary' => $str($content['summary'] ?? ''),
            'experience' => array_map(fn (array $e) => [
                'position' => $str($e['position'] ?? ''),
                'company' => $str($e['company'] ?? ''),
                'dates' => $this->dateRange($str($e['startDate'] ?? ''), $str($e['endDate'] ?? ''), true),
                'description' => $str($e['description'] ?? ''),
                'bullets' => $list($e['bullets'] ?? []),
            ], $rows($content['experience'] ?? [])),
            'education' => array_map(fn (array $e) => [
                'institution' => $str($e['institution'] ?? ''),
                'degree' => $str($e['degree'] ?? ''),
                'field' => $str($e['field'] ?? ''),
                'dates' => $this->dateRange($str($e['startDate'] ?? ''), $str($e['endDate'] ?? ''), false),
                'gpa' => $str($e['gpa'] ?? ''),
            ], $rows($content['education'] ?? [])),
            'skills' => array_values(array_filter(array_map(fn (array $g) => [
                'category' => $str($g['category'] ?? ''),
                'items' => $list($g['items'] ?? []),
            ], $rows($content['skills'] ?? [])), fn (array $g) => ! empty($g['items']))),
            'projects' => array_map(function (array $p) use ($str, $list) {
                $url = $this->safeUrl($str($p['url'] ?? ''));

                return [
                    'name' => $str($p['name'] ?? ''),
                    'description' => $str($p['description'] ?? ''),
                    'url' => $url,
                    'urlLabel' => $this->displayUrl($url),
                    'technologies' => $list($p['technologies'] ?? []),
                ];
            }, $rows($content['projects'] ?? [])),
            'certifications' => array_map(fn (array $c) => [
                'name' => $str($c['name'] ?? ''),
                'issuer' => $str($c['issuer'] ?? ''),
                'date' => $str($c['date'] ?? ''),
            ], $rows($content['certifications'] ?? [])),
        ];
    }

    /**
     * "Jan 2020 – Present" style range. A missing end on a job means it is the
     * current one; a missing end on education just shows the start.
     */
    private function dateRange(string $start, string $end, bool $openEndedIsCurrent): string
    {
        if ($start === '' && $end === '') {
            return '';
        }
        if ($start === '') {
            return $end;
        }
        if ($end === '') {
            return $openEndedIsCurrent ? $start.' – Present' : $start;
        }

        return $start.' – '.$end;
    }

    /**
     * Only http(s) links are rendered. A bare "github.com/x" gets https://;
     * any other scheme (javascript:, data:, …) is dropped, because these links
     * end up clickable inside the preview iframe and the exported files.
     */
    private function safeUrl(string $url): string
    {
        if ($url === '') {
            return '';
        }
        if (preg_match('#^https?://#i', $url)) {
            return $url;
        }
        if (preg_match('#^[a-z][a-z0-9+.-]*:#i', $url)) {
            return '';
        }

        return 'https://'.ltrim($url, '/');
    }

    private function displayUrl(string $url): string
    {
        return rtrim((string) preg_replace('#^https?://(www\.)?#i', '', $url), '/');
    }

    // ---------- theme helpers ----------

    private function hexOr(mixed $value, string $fallback): string
    {
        return is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value)
            ? strtolower($value)
            : $fallback;
    }

    private function fontKeyOr(mixed $value, string $fallback): string
    {
        return is_string($value) && array_key_exists($value, self::FONTS) ? $value : $fallback;
    }

    /**
     * Blend two hex colours; $weight is how much of $b to use (0..1).
     */
    private function mix(string $a, string $b, float $weight): string
    {
        [$ar, $ag, $ab] = $this->rgb($a);
        [$br, $bg, $bb] = $this->rgb($b);
        $c = fn (int $x, int $y) => str_pad(dechex((int) round($x + ($y - $x) * $weight)), 2, '0', STR_PAD_LEFT);

        return '#'.$c($ar, $br).$c($ag, $bg).$c($ab, $bb);
    }

    /** Relative luminance in [0, 1] (WCAG formula). */
    private function luminance(string $hex): float
    {
        $channel = function (int $v): float {
            $s = $v / 255;

            return $s <= 0.03928 ? $s / 12.92 : (($s + 0.055) / 1.055) ** 2.4;
        };
        [$r, $g, $b] = $this->rgb($hex);

        return 0.2126 * $channel($r) + 0.7152 * $channel($g) + 0.0722 * $channel($b);
    }

    /** @return array{0:int,1:int,2:int} */
    private function rgb(string $hex): array
    {
        $h = ltrim($hex, '#');

        return [hexdec(substr($h, 0, 2)), hexdec(substr($h, 2, 2)), hexdec(substr($h, 4, 2))];
    }

    private function addSection(\PhpOffice\PhpWord\Element\Section $section, string $title, string $color, string $font): void
    {
        $section->addTextBreak(1);
        $section->addText(strtoupper($title), ['bold' => true, 'size' => 12, 'color' => $color, 'name' => $font]);
    }

    /**
     * Content used to render template thumbnails.
     */
    private function sampleContent(): array
    {
        return [
            'contact' => [
                'name' => 'Alex Morgan',
                'email' => 'alex.morgan@example.com',
                'phone' => '+1 (555) 014-2387',
                'location' => 'Austin, TX',
                'website' => 'alexmorgan.dev',
                'linkedin' => 'linkedin.com/in/alexmorgan',
                'github' => 'github.com/alexmorgan',
            ],
            'summary' => 'Product-minded software engineer with 7 years building web platforms end to end. Enjoys turning ambiguous problems into simple, reliable systems and mentoring the people who run them.',
            'experience' => [
                [
                    'position' => 'Senior Software Engineer',
                    'company' => 'Northwind Digital',
                    'startDate' => 'Mar 2021',
                    'endDate' => '',
                    'description' => '',
                    'bullets' => [
                        'Led the rebuild of the billing platform, cutting invoice errors by 60%.',
                        'Designed the event pipeline that now processes 4M events a day.',
                        'Mentored five engineers through their first production launches.',
                    ],
                ],
                [
                    'position' => 'Software Engineer',
                    'company' => 'Meridian Labs',
                    'startDate' => 'Jun 2018',
                    'endDate' => 'Feb 2021',
                    'description' => '',
                    'bullets' => [
                        'Shipped the customer dashboard used by 30k monthly users.',
                        'Introduced automated testing that halved regression bugs.',
                    ],
                ],
            ],
            'education' => [
                [
                    'institution' => 'University of Texas at Austin',
                    'degree' => 'B.S.',
                    'field' => 'Computer Science',
                    'startDate' => '2014',
                    'endDate' => '2018',
                    'gpa' => '3.8',
                ],
            ],
            'skills' => [
                ['category' => 'Languages', 'items' => ['TypeScript', 'PHP', 'Python', 'SQL']],
                ['category' => 'Frameworks', 'items' => ['React', 'Next.js', 'Laravel']],
                ['category' => 'Tools', 'items' => ['Docker', 'AWS', 'PostgreSQL', 'Redis']],
            ],
            'projects' => [
                [
                    'name' => 'OpenLedger',
                    'description' => 'Open-source double-entry bookkeeping API with 1.2k GitHub stars.',
                    'url' => 'github.com/alexmorgan/openledger',
                    'technologies' => ['Laravel', 'PostgreSQL'],
                ],
            ],
            'certifications' => [
                ['name' => 'AWS Solutions Architect – Associate', 'issuer' => 'Amazon Web Services', 'date' => '2023'],
            ],
        ];
    }
}
