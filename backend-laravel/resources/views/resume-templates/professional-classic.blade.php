{{-- Professional Classic — serif, tinted sidebar with contact/skills/education. --}}
@extends('resume-templates._base')

@section('styles')
.rm-page { padding: 0; max-width: 820px; }
.pc-side { padding: {{ $theme['pagePad'] }} 16px; }
.pc-main { padding: {{ $theme['pagePad'] }} {{ $theme['pagePad'] }} {{ $theme['pagePad'] }} 24px; }
.pc-header { padding-bottom: 10px; margin-bottom: 16px; border-bottom: 2px solid {{ $theme['primary'] }}; }
.pc-header .rm-name { font-size: 29px; color: {{ $theme['primary'] }}; letter-spacing: 0.01em; }
.pc-side .rm-h { font-size: 10.5px; border-bottom: 1px solid {{ $theme['tintStrong'] }}; padding-bottom: 4px; }
.pc-side .rm-section { margin-top: 16px; }
.pc-side .rm-section:first-child { margin-top: 0; }
.pc-side .rm-contact-stack { font-size: 0.92em; color: {{ $theme['muted'] }}; }
.pc-side .rm-contact-stack a { color: {{ $theme['primary'] }}; }
.pc-main .rm-h { border-bottom: 1px solid {{ $theme['rule'] }}; padding-bottom: 4px; }

@if ($theme['pdf'])
{{-- See bold-sidebar: a table row cannot split across pages in dompdf. --}}
@page { margin: {{ $theme['pagePad'] }} 0; }
.pc-wrap { position: relative; }
.pc-strip { position: fixed; z-index: -1; top: -{{ $theme['pagePad'] }}; bottom: -{{ $theme['pagePad'] }}; left: 0; width: 31%; background: {{ $theme['tint'] }}; }
.pc-side { position: absolute; z-index: 10; top: 0; left: 0; width: 25.5%; padding-top: 0; } /* 31% strip minus 2x16px padding: dompdf ignores box-sizing */
.pc-main { margin-left: 31%; padding-top: 0; padding-bottom: 0; }
@else
.pc-wrap { display: flex; min-height: 100vh; }
.pc-strip { display: none; }
.pc-side { width: 31%; flex: none; background: {{ $theme['tint'] }}; }
.pc-main { flex: 1; min-width: 0; }
@endif
@endsection

@section('body')
<div class="pc-strip"></div>
<div class="rm-page">
    <div class="pc-wrap">
        <div class="pc-side">
            <section class="rm-section">
                <h2 class="rm-h">Contact</h2>
                @include('resume-templates.partials.contact-stack')
            </section>
            @include('resume-templates.partials.skills', ['style' => 'stacked'])
            @include('resume-templates.partials.education', ['layout' => 'compact'])
            @include('resume-templates.partials.certifications')
        </div>
        <div class="pc-main">
            <header class="pc-header">
                <h1 class="rm-name">{{ $content['contact']['name'] }}</h1>
            </header>
            @include('resume-templates.partials.summary', ['title' => 'Profile'])
            @include('resume-templates.partials.experience')
            @include('resume-templates.partials.projects')
        </div>
    </div>
</div>
@endsection
