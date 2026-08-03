<?php

namespace App\Services;

use App\Models\GeneratedResume;
use App\Models\ResumeTemplate;
use Barryvdh\DomPDF\PDF;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;

/**
 * Resume template renderer (§6).
 *
 * Renders a GeneratedResume's content_json into 3 formats:
 *   - HTML — Blade view at resources/views/resume-templates/{slug}.blade.php
 *   - PDF  — HTML → laravel-dompdf
 *   - DOCX — phpword (content-accurate, layout-approximate per §6 caveat)
 *
 * All 6 templates share a layout (resources/views/layouts/resume.blade.php)
 * and a common set of partials. The per-template blade file injects the
 * template's color + font palette via CSS variables.
 */
class ResumeTemplateRenderer
{
    public const FORMATS = ['html', 'pdf', 'docx'];

    /**
     * The list of slugs this renderer knows how to render.
     */
    public static function knownSlugs(): array
    {
        return [
            'modern-clean', 'professional-classic', 'creative',
            'executive', 'technical', 'academic',
        ];
    }

    public function isRenderable(ResumeTemplate|string $templateOrSlug): bool
    {
        $slug = $templateOrSlug instanceof ResumeTemplate ? $templateOrSlug->slug : $templateOrSlug;
        return in_array($slug, self::knownSlugs(), true);
    }

    /**
     * Render the resume content to a full HTML document.
     *
     * @param array $content     the structured content_json
     * @param array $customization colors/fonts/spacing overrides
     */
    public function renderHtml(ResumeTemplate $template, array $content, array $customization = []): string
    {
        $slug = $template->slug;
        if (! $this->isRenderable($slug)) {
            throw new \InvalidArgumentException("Template '{$slug}' has no renderer");
        }
        $view = "resume-templates.{$slug}";
        return View::make($view, [
            'content' => $this->normalizeContent($content),
            'customization' => $customization,
            'meta' => $this->metaFor($slug),
        ])->render();
    }

    /**
     * Render the resume to PDF (HTML → dompdf).
     */
    public function renderPdf(GeneratedResume $resume): string
    {
        $html = $this->renderHtml($resume->template, $resume->content_json ?? [], $resume->customization_json ?? []);
        /** @var PDF $pdf */
        $pdf = app('dompdf.wrapper');
        $pdf->loadHTML($html);
        return $pdf->output();
    }

    /**
     * Render the resume to DOCX via phpword.
     *
     * Per §6: content-accurate, layout-approximate. DOCX doesn't have CSS —
     * the conversion preserves all text + structure (headings, lists, tables)
     * but visual fidelity (colors, fonts, spacing) is approximate.
     */
    public function renderDocx(GeneratedResume $resume): string
    {
        $content = $this->normalizeContent($resume->content_json ?? []);
        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('Calibri');
        $phpWord->setDefaultFontSize(11);

        $section = $phpWord->addSection();

        // Name + contact.
        $contact = $content['contact'] ?? [];
        if (! empty($contact['name'])) {
            $section->addText($contact['name'], ['bold' => true, 'size' => 24]);
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

        if (! empty($content['summary'])) {
            $this->addSection($section, 'Summary');
            $section->addText($content['summary'], ['size' => 11]);
        }

        if (! empty($content['experience'])) {
            $this->addSection($section, 'Experience');
            foreach ($content['experience'] as $exp) {
                $section->addText($exp['position'] ?? '', ['bold' => true]);
                $meta = trim(($exp['company'] ?? '').' · '.($exp['startDate'] ?? '').' – '.($exp['endDate'] ?? 'Present'));
                if ($meta !== '') {
                    $section->addText($meta, ['italic' => true, 'size' => 10, 'color' => '555555']);
                }
                if (! empty($exp['description'])) {
                    $section->addText($exp['description']);
                }
                if (! empty($exp['bullets']) && is_array($exp['bullets'])) {
                    foreach ($exp['bullets'] as $b) {
                        $section->addListItem($b);
                    }
                }
            }
        }

        if (! empty($content['education'])) {
            $this->addSection($section, 'Education');
            foreach ($content['education'] as $edu) {
                $section->addText($edu['institution'] ?? '', ['bold' => true]);
                $section->addText(($edu['degree'] ?? '').' '.($edu['field'] ?? ''), ['italic' => true, 'size' => 10]);
            }
        }

        if (! empty($content['skills']) && is_array($content['skills'])) {
            $this->addSection($section, 'Skills');
            foreach ($content['skills'] as $group) {
                $line = ($group['category'] ?? '').': '.implode(', ', $group['items'] ?? []);
                $section->addText($line, ['size' => 10]);
            }
        }

        if (! empty($content['projects'])) {
            $this->addSection($section, 'Projects');
            foreach ($content['projects'] as $proj) {
                $section->addText($proj['name'] ?? '', ['bold' => true]);
                if (! empty($proj['description'])) {
                    $section->addText($proj['description']);
                }
            }
        }

        if (! empty($content['certifications'])) {
            $this->addSection($section, 'Certifications');
            foreach ($content['certifications'] as $cert) {
                $line = ($cert['name'] ?? '').' · '.($cert['issuer'] ?? '').' · '.($cert['date'] ?? '');
                $section->addListItem($line);
            }
        }

        $tmpFile = tempnam(sys_get_temp_dir(), 'rm_docx_').'.docx';
        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tmpFile);
        $bytes = (string) file_get_contents($tmpFile);
        @unlink($tmpFile);
        return $bytes;
    }

    /**
     * The DOCX caveat string returned by the export endpoint.
     */
    public function docxCaveat(): string
    {
        return 'content-accurate, layout-approximate';
    }

    // ---------- helpers ----------

    private function addSection(\PhpOffice\PhpWord\Element\Section $section, string $title): void
    {
        $section->addTextBreak(1);
        $section->addText($title, ['bold' => true, 'size' => 13, 'color' => '1f2937']);
    }

    /**
     * Normalize the content_json into the shape the Blade templates expect.
     */
    private function normalizeContent(array $content): array
    {
        return [
            'contact' => $content['contact'] ?? [],
            'summary' => $content['summary'] ?? '',
            'experience' => $content['experience'] ?? [],
            'education' => $content['education'] ?? [],
            'skills' => $content['skills'] ?? [],
            'projects' => $content['projects'] ?? [],
            'certifications' => $content['certifications'] ?? [],
        ];
    }

    /**
     * Per-template metadata (mirrors the meta.ts files under src/lib/resume-templates).
     */
    private function metaFor(string $slug): array
    {
        return match ($slug) {
            'modern-clean' => [
                'slug' => 'modern-clean',
                'name' => 'Modern Clean',
                'description' => 'Modern Clean — Minimalist single-column with clear typography hierarchy',
                'colors' => ['primary' => '#059669', 'accent' => '#34d399', 'text' => '#1f2937'],
                'fonts' => [
                    'heading' => "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
                    'body' => "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                ],
            ],
            'professional-classic' => [
                'slug' => 'professional-classic',
                'name' => 'Professional Classic',
                'description' => 'Professional Classic — Traditional serif, two-column with sidebar',
                'colors' => ['primary' => '#1e3a5f', 'accent' => '#3b82f6', 'text' => '#1f2937'],
                'fonts' => [
                    'heading' => "Georgia, 'Times New Roman', serif",
                    'body' => "Georgia, 'Times New Roman', serif",
                ],
            ],
            'creative' => [
                'slug' => 'creative',
                'name' => 'Creative',
                'description' => 'Creative — Bold accents and asymmetric layout for design roles',
                'colors' => ['primary' => '#9333ea', 'accent' => '#ec4899', 'text' => '#1f2937'],
                'fonts' => [
                    'heading' => "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    'body' => "'Helvetica Neue', Helvetica, Arial, sans-serif",
                ],
            ],
            'executive' => [
                'slug' => 'executive',
                'name' => 'Executive',
                'description' => 'Executive — Compact, dense, executive-level format with summary on top',
                'colors' => ['primary' => '#0f172a', 'accent' => '#475569', 'text' => '#1f2937'],
                'fonts' => [
                    'heading' => "'Times New Roman', Georgia, serif",
                    'body' => "'Helvetica Neue', Arial, sans-serif",
                ],
            ],
            'technical' => [
                'slug' => 'technical',
                'name' => 'Technical',
                'description' => 'Technical — Skills-forward layout emphasizing tech stack',
                'colors' => ['primary' => '#0891b2', 'accent' => '#22d3ee', 'text' => '#1f2937'],
                'fonts' => [
                    'heading' => "'Helvetica Neue', Arial, sans-serif",
                    'body' => "'SFMono-Regular', Menlo, Monaco, Consolas, monospace",
                ],
            ],
            'academic' => [
                'slug' => 'academic',
                'name' => 'Academic',
                'description' => 'Academic — Citation-friendly format for researchers and academics',
                'colors' => ['primary' => '#1f2937', 'accent' => '#6b7280', 'text' => '#111827'],
                'fonts' => [
                    'heading' => "Georgia, 'Times New Roman', serif",
                    'body' => "Georgia, 'Times New Roman', serif",
                ],
            ],
            default => [
                'slug' => $slug, 'name' => ucfirst($slug), 'description' => '',
                'colors' => ['primary' => '#1f2937', 'accent' => '#6b7280', 'text' => '#1f2937'],
                'fonts' => ['heading' => 'inherit', 'body' => 'inherit'],
            ],
        };
    }
}
