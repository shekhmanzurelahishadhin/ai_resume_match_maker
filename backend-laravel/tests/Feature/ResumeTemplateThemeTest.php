<?php

namespace Tests\Feature;

use App\Models\GeneratedResume;
use App\Models\ResumeTemplate;
use App\Models\User;
use App\Services\ResumeTemplateRenderer;
use Database\Seeders\ResumeTemplateSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeTemplateThemeTest extends TestCase
{
    use RefreshDatabase;

    private ResumeTemplateRenderer $renderer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ResumeTemplateSeeder::class);
        $this->renderer = $this->app->make(ResumeTemplateRenderer::class);
    }

    public function test_seeder_creates_a_row_for_every_renderable_template(): void
    {
        $this->assertEqualsCanonicalizing(
            ResumeTemplateRenderer::knownSlugs(),
            ResumeTemplate::pluck('slug')->all(),
        );
    }

    public function test_every_template_renders_all_sections_and_they_differ(): void
    {
        $hashes = [];
        foreach (ResumeTemplateRenderer::knownSlugs() as $slug) {
            $html = $this->renderer->renderSample($slug);

            foreach (['Northwind Digital', 'University of Texas', 'TypeScript', 'OpenLedger', 'AWS Solutions Architect'] as $needle) {
                $this->assertStringContainsString($needle, $html, "{$slug} is missing '{$needle}'");
            }
            $hashes[$slug] = md5($html);
        }

        $this->assertCount(count($hashes), array_unique($hashes), 'Two templates rendered identical HTML');
    }

    public function test_every_template_exports_to_pdf(): void
    {
        foreach (ResumeTemplateRenderer::knownSlugs() as $slug) {
            $html = $this->renderer->renderSlug($slug, ['contact' => ['name' => 'Jane Doe']], [], forPdf: true);
            $pdf = app('dompdf.wrapper');
            $pdf->loadHTML($html);

            $this->assertStringStartsWith('%PDF', $pdf->output(), "{$slug} did not produce a PDF");
        }
    }

    public function test_a_valid_theme_is_applied(): void
    {
        $html = $this->renderer->renderSample('modern-clean', [
            'primaryColor' => '#BE123C',
            'headingFont' => 'serif',
            'bodyFont' => 'mono',
            'spacing' => 'compact',
            'fontSize' => 'large',
        ]);

        $this->assertStringContainsString('#be123c', $html);
        $this->assertStringContainsString("Georgia, 'Times New Roman'", $html);
        $this->assertStringContainsString('Consolas', $html);
        $this->assertStringContainsString('font-size: 13.5px', $html);
    }

    public function test_hostile_theme_values_never_reach_the_stylesheet(): void
    {
        $html = $this->renderer->renderSample('modern-clean', [
            'primaryColor' => 'red;}</style><script>alert(1)</script>',
            'accentColor' => 'url(javascript:alert(1))',
            'headingFont' => 'x}body{display:none',
        ]);

        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringNotContainsString('display:none', $html);
        // Falls back to the template's own colour.
        $this->assertStringContainsString(ResumeTemplateRenderer::TEMPLATES['modern-clean']['primary'], $html);
    }

    public function test_only_http_links_are_rendered(): void
    {
        $html = $this->renderer->renderSlug('modern-clean', ['contact' => [
            'name' => 'Jane',
            'website' => 'javascript:alert(1)',
            'linkedin' => 'data:text/html,hi',
            'github' => 'github.com/jane',
        ]]);

        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringNotContainsString('data:text', $html);
        $this->assertStringContainsString('href="https://github.com/jane"', $html);
    }

    public function test_update_rejects_an_invalid_customization(): void
    {
        [$user, $gen] = $this->makeResume();

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/resumes/generate/{$gen->id}", [
                'customizationJson' => ['primaryColor' => 'red;}', 'headingFont' => 'comic-sans'],
            ])
            ->assertStatus(422);
    }

    public function test_update_can_switch_template_and_theme_without_touching_content(): void
    {
        [$user, $gen] = $this->makeResume();
        $sidebar = ResumeTemplate::where('slug', 'bold-sidebar')->first();

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/resumes/generate/{$gen->id}", [
                'templateId' => $sidebar->id,
                'customizationJson' => ['primaryColor' => '#0f766e', 'spacing' => 'relaxed'],
            ])
            ->assertOk()
            ->assertJsonPath('data.resume.template.slug', 'bold-sidebar')
            ->assertJsonPath('data.resume.customizationJson.primaryColor', '#0f766e')
            // A design-only change is not a new content version.
            ->assertJsonPath('data.resume.version', 1);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/resumes/generate/{$gen->id}/preview")
            ->assertOk()
            ->assertSee('#0f766e', false)
            ->assertSee('bs-side', false);
    }

    public function test_saving_content_keeps_blank_fields_as_empty_strings(): void
    {
        [$user, $gen] = $this->makeResume();

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/resumes/generate/{$gen->id}", [
                'contentJson' => [
                    'contact' => ['name' => 'Jane Doe', 'email' => 'jane@example.com', 'phone' => ''],
                    'summary' => '',
                    'experience' => [[
                        'company' => 'Acme', 'position' => 'Engineer', 'startDate' => '2020',
                        'endDate' => '', 'description' => '', 'bullets' => ['Shipped things'],
                    ]],
                    'education' => [], 'skills' => [], 'projects' => [], 'certifications' => [],
                ],
            ])
            ->assertOk()
            // null here made the editor's string schema reject the resume.
            ->assertJsonPath('data.resume.contentJson.summary', '')
            ->assertJsonPath('data.resume.contentJson.contact.phone', '')
            ->assertJsonPath('data.resume.contentJson.experience.0.endDate', '');
    }

    public function test_export_returns_the_file_as_a_download(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        [$user, $gen] = $this->makeResume();

        foreach (['pdf' => 'application/pdf', 'docx' => 'wordprocessingml', 'html' => 'text/html'] as $format => $mime) {
            $res = $this->actingAs($user, 'sanctum')
                ->postJson("/api/resumes/generate/{$gen->id}/export", ['format' => $format])
                ->assertOk();
            $this->assertStringContainsString($mime, $res->headers->get('Content-Type'));
            $this->assertStringContainsString("jane-doe-resume.{$format}", $res->headers->get('Content-Disposition'));
            $this->assertNotEmpty($res->getContent());
        }

        // Someone else's resume stays private.
        $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson("/api/resumes/generate/{$gen->id}/export", ['format' => 'pdf'])
            ->assertForbidden();
    }

    public function test_docx_escapes_special_characters_into_valid_xml(): void
    {
        [, $gen] = $this->makeResume();
        $gen->update(['content_json' => [
            'contact' => ['name' => 'Jane <Doe> & Co', 'email' => 'jane@example.com'],
            'summary' => "R&D lead \"quoted\" with a stray control char\x0B here",
            'education' => [['institution' => 'School & College', 'degree' => 'B.Sc.', 'field' => 'CSE & EEE']],
            'skills' => [['category' => 'Q&A', 'items' => ['C++', 'AT&T']]],
        ]]);

        $bytes = app(ResumeTemplateRenderer::class)->renderDocx($gen->fresh('template'));

        $path = tempnam(sys_get_temp_dir(), 'docx_test_');
        file_put_contents($path, $bytes);
        $zip = new \ZipArchive();
        $this->assertTrue($zip->open($path) === true);
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        @unlink($path);

        $doc = new \DOMDocument();
        $this->assertTrue(@$doc->loadXML($xml), 'word/document.xml must be well-formed');
        $this->assertStringContainsString('School &amp; College', $xml);
        $this->assertStringContainsString('R&amp;D lead', $xml);
    }

    public function test_template_list_exposes_defaults_and_theme_options(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/templates')
            ->assertOk()
            ->assertJsonCount(count(ResumeTemplateRenderer::TEMPLATES), 'data.items')
            ->assertJsonStructure(['data' => [
                'items' => [['slug', 'defaults' => ['primaryColor', 'accentColor', 'headingFont', 'bodyFont']]],
                'options' => ['fonts', 'spacings', 'fontSizes'],
            ]]);
    }

    public function test_sample_endpoint_renders_a_thumbnail(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/templates/minimal/sample')
            ->assertOk()
            ->assertJsonStructure(['data' => ['html']]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/templates/does-not-exist/sample')
            ->assertNotFound();
    }

    /**
     * @return array{0: User, 1: GeneratedResume}
     */
    private function makeResume(): array
    {
        $user = User::factory()->create();
        $gen = GeneratedResume::create([
            'user_id' => $user->id,
            'template_id' => ResumeTemplate::where('slug', 'modern-clean')->value('id'),
            'content_json' => ['contact' => ['name' => 'Jane Doe', 'email' => 'jane@example.com']],
            'version' => 1,
            'is_current' => true,
        ]);

        return [$user, $gen];
    }
}
