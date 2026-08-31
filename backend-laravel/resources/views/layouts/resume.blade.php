{{--
  Shared layout for all 6 resume templates.
  Accepts:
    - $content  array (contact, summary, experience, education, skills, projects, certifications)
    - $customization array (primaryColor, fontFamily, spacing, fontSize)
    - $meta     array (slug, name, colors, fonts)
    - $slot     the per-template body content (name + section blocks)
--}}
@php
    $colors = $meta['colors'] ?? ['primary' => '#1f2937', 'accent' => '#6b7280', 'text' => '#1f2937'];
    $fonts = $meta['fonts'] ?? ['heading' => 'inherit', 'body' => 'inherit'];
    $primaryColor = $customization['primaryColor'] ?? $colors['primary'];
    $fontFamily = $customization['fontFamily'] ?? $fonts['body'];
    $spacing = $customization['spacing'] ?? 'normal';
    $fontSize = $customization['fontSize'] ?? 'medium';

    $paddingMap = ['compact' => '24px', 'normal' => '40px', 'relaxed' => '56px'];
    $fontMap = ['small' => '12px', 'medium' => '13px', 'large' => '14px'];
    $pagePadding = $paddingMap[$spacing] ?? '40px';
    $baseFont = $fontMap[$fontSize] ?? '13px';
@endphp
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{{ $content['contact']['name'] ?? 'Resume' }} — Resume</title>
<style>
:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
    font-family: {{ $fontFamily ?: $fonts['body'] }};
    color: {{ $colors['text'] }};
    background: #ffffff;
    font-size: {{ $baseFont }};
    line-height: 1.5;
}
.rm-page {
    max-width: 800px;
    margin: 0 auto;
    padding: {{ $pagePadding }};
}
.rm-name {
    font-family: {{ $fonts['heading'] }};
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 4px 0;
    color: {{ $colors['text'] }};
    letter-spacing: -0.01em;
}
.rm-contact-links {
    font-size: 12px;
    color: #4b5563;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
}
.rm-contact-links a { color: {{ $primaryColor }}; text-decoration: none; }
.rm-contact-links a:hover { text-decoration: underline; }
.rm-section { margin-top: 22px; }
.rm-section-title {
    font-family: {{ $fonts['heading'] }};
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: {{ $primaryColor }};
    margin: 0 0 10px 0;
    padding-bottom: 4px;
    border-bottom: 1.5px solid {{ $primaryColor }};
}
.rm-exp-item, .rm-edu-item { margin-bottom: 12px; }
.rm-exp-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    align-items: baseline;
}
.rm-exp-position { font-weight: 600; }
.rm-exp-meta { font-size: 12px; color: #4b5563; }
.rm-exp-desc { margin: 4px 0 0 0; color: #374151; }
.rm-bullets { margin: 6px 0 0 18px; padding: 0; color: #374151; }
.rm-bullets li { margin-bottom: 3px; }
.rm-skill-group { margin-bottom: 6px; }
.rm-skill-cat { font-weight: 600; color: #374151; margin-right: 6px; }
.rm-skill-items { color: #4b5563; }
.rm-summary p { margin: 0; color: #374151; }
</style>
@yield('head-extra')
</head>
<body>
<div class="rm-page">
    {{-- Contact header --}}
    <header class="rm-contact">
        <h1 class="rm-name">{{ $content['contact']['name'] ?? '' }}</h1>
        <div class="rm-contact-links">
            @if(!empty($content['contact']['email']))<span>{{ $content['contact']['email'] }}</span>@endif
            @if(!empty($content['contact']['phone']))<span>· {{ $content['contact']['phone'] }}</span>@endif
            @if(!empty($content['contact']['location']))<span>· {{ $content['contact']['location'] }}</span>@endif
            @if(!empty($content['contact']['website']))<span>· <a href="{{ $content['contact']['website'] }}">{{ $content['contact']['website'] }}</a></span>@endif
            @if(!empty($content['contact']['linkedin']))<span>· <a href="{{ $content['contact']['linkedin'] }}">LinkedIn</a></span>@endif
            @if(!empty($content['contact']['github']))<span>· <a href="{{ $content['contact']['github'] }}">GitHub</a></span>@endif
        </div>
    </header>

    {{-- Summary --}}
    @if(!empty($content['summary']))
    <section class="rm-section rm-summary">
        <h2 class="rm-section-title">Summary</h2>
        <p>{{ $content['summary'] }}</p>
    </section>
    @endif

    {{-- Experience --}}
    @if(!empty($content['experience']))
    <section class="rm-section rm-experience">
        <h2 class="rm-section-title">Experience</h2>
        @foreach($content['experience'] as $exp)
            <div class="rm-exp-item">
                <div class="rm-exp-head">
                    <span class="rm-exp-position">{{ $exp['position'] ?? '' }}</span>
                    <span class="rm-exp-meta">
                        {{ $exp['company'] ?? '' }}
                        @if(!empty($exp['startDate']))
                            · {{ $exp['startDate'] }}
                            @if(!empty($exp['endDate']))
                                – {{ $exp['endDate'] }}
                            @else
                                – Present
                            @endif
                        @endif
                    </span>
                </div>
                @if(!empty($exp['description']))<p class="rm-exp-desc">{{ $exp['description'] }}</p>@endif
                @if(!empty($exp['bullets']) && is_array($exp['bullets']))
                <ul class="rm-bullets">
                    @foreach($exp['bullets'] as $bullet)<li>{{ $bullet }}</li>@endforeach
                </ul>
                @endif
            </div>
        @endforeach
    </section>
    @endif

    {{-- Education --}}
    @if(!empty($content['education']))
    <section class="rm-section rm-education">
        <h2 class="rm-section-title">Education</h2>
        @foreach($content['education'] as $edu)
            <div class="rm-edu-item">
                <div class="rm-exp-head">
                    <span class="rm-exp-position">{{ $edu['institution'] ?? '' }}</span>
                    <span class="rm-exp-meta">
                        @if(!empty($edu['startDate']))
                            {{ $edu['startDate'] }}
                            @if(!empty($edu['endDate']))
                                – {{ $edu['endDate'] }}
                            @endif
                        @endif
                    </span>
                </div>
                @if(!empty($edu['degree']))
                <p class="rm-exp-desc">{{ $edu['degree'] }}@if(!empty($edu['field'])), {{ $edu['field'] }}@endif @if(!empty($edu['gpa']))· GPA: {{ $edu['gpa'] }}@endif</p>
                @endif
            </div>
        @endforeach
    </section>
    @endif

    {{-- Skills --}}
    @if(!empty($content['skills']) && is_array($content['skills']))
    <section class="rm-section rm-skills">
        <h2 class="rm-section-title">Skills</h2>
        @foreach($content['skills'] as $group)
            <div class="rm-skill-group">
                <span class="rm-skill-cat">{{ $group['category'] ?? '' }}:</span>
                <span class="rm-skill-items">{{ implode(', ', $group['items'] ?? []) }}</span>
            </div>
        @endforeach
    </section>
    @endif

    {{-- Projects --}}
    @if(!empty($content['projects']))
    <section class="rm-section rm-projects">
        <h2 class="rm-section-title">Projects</h2>
        @foreach($content['projects'] as $proj)
            <div class="rm-exp-item">
                <div class="rm-exp-head">
                    <span class="rm-exp-position">{{ $proj['name'] ?? '' }}</span>
                    @if(!empty($proj['url']))<span class="rm-exp-meta"><a href="{{ $proj['url'] }}">{{ $proj['url'] }}</a></span>@endif
                </div>
                @if(!empty($proj['description']))<p class="rm-exp-desc">{{ $proj['description'] }}</p>@endif
                @if(!empty($proj['technologies']) && is_array($proj['technologies']))
                <p class="rm-exp-desc"><em>Tech: {{ implode(', ', $proj['technologies']) }}</em></p>
                @endif
            </div>
        @endforeach
    </section>
    @endif

    {{-- Certifications --}}
    @if(!empty($content['certifications']))
    <section class="rm-section rm-certs">
        <h2 class="rm-section-title">Certifications</h2>
        <ul class="rm-bullets">
            @foreach($content['certifications'] as $cert)
                <li><strong>{{ $cert['name'] ?? '' }}</strong>@if(!empty($cert['issuer'])), {{ $cert['issuer'] }}@endif @if(!empty($cert['date'])) · {{ $cert['date'] }}@endif</li>
            @endforeach
        </ul>
    </section>
    @endif

    {{-- Per-template slot for additional accents --}}
    @isset($slot){{ $slot }}@endisset
</div>
</body>
</html>
