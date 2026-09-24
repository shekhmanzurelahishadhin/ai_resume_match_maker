{{-- Bold Sidebar — solid colour sidebar (name, contact, skills) beside the main story. --}}
@extends('resume-templates._base')

@section('styles')
.rm-page { padding: 0; max-width: 820px; }
.bs-side { color: {{ $theme['onPrimary'] }}; padding: {{ $theme['pagePad'] }} 20px; }
.bs-main { padding: {{ $theme['pagePad'] }} {{ $theme['pagePad'] }} {{ $theme['pagePad'] }} 24px; }
.bs-side .rm-name { font-size: 25px; color: {{ $theme['onPrimary'] }}; margin-bottom: 18px; }
.bs-side .rm-h { color: {{ $theme['onPrimary'] }}; border-bottom: 1px solid {{ $theme['accent'] }}; padding-bottom: 4px; }
.bs-side .rm-section { margin-top: 18px; }
.bs-side .rm-contact-stack { color: {{ $theme['onPrimaryMuted'] }}; font-size: 0.92em; }
.bs-side .rm-contact-stack a { color: {{ $theme['onPrimary'] }}; }
.bs-side .rm-sub, .bs-side .rm-date { color: {{ $theme['onPrimaryMuted'] }}; }
.bs-side .rm-skill-group-label { color: {{ $theme['accent'] }}; }
.bs-side .rm-chip { background: transparent; color: {{ $theme['onPrimary'] }}; border: 1px solid {{ $theme['accent'] }}; }
.bs-main .rm-h { color: {{ $theme['primary'] }}; border-bottom: 2px solid {{ $theme['tintStrong'] }}; padding-bottom: 4px; }
.bs-main .rm-section:first-child { margin-top: 0; }

@if ($theme['pdf'])
{{--
  dompdf cannot split one table row across pages, so a two-column table
  pushed the whole resume onto its last page. Instead: a fixed colour strip
  (dompdf repeats fixed elements on every page), the sidebar content placed
  absolutely on page 1, and the main column in normal flow so it paginates.
--}}
@page { margin: {{ $theme['pagePad'] }} 0; }
.bs-wrap { position: relative; }
.bs-strip { position: fixed; z-index: -1; top: -{{ $theme['pagePad'] }}; bottom: -{{ $theme['pagePad'] }}; left: 0; width: 33%; background: {{ $theme['primary'] }}; }
.bs-side { position: absolute; z-index: 10; top: 0; left: 0; width: 26%; padding-top: 0; } /* 33% strip minus 2x20px padding: dompdf ignores box-sizing */
.bs-main { margin-left: 33%; padding-top: 0; padding-bottom: 0; }
@else
.bs-wrap { display: flex; min-height: 100vh; }
.bs-strip { display: none; }
.bs-side { width: 33%; flex: none; background: {{ $theme['primary'] }}; }
.bs-main { flex: 1; min-width: 0; }
@endif
@endsection

@section('body')
<div class="bs-strip"></div>
<div class="rm-page">
    <div class="bs-wrap">
        <div class="bs-side">
            <h1 class="rm-name">{{ $content['contact']['name'] }}</h1>
            <section class="rm-section">
                <h2 class="rm-h">Contact</h2>
                @include('resume-templates.partials.contact-stack')
            </section>
            @include('resume-templates.partials.skills', ['style' => 'chips'])
            @include('resume-templates.partials.education', ['layout' => 'compact'])
            @include('resume-templates.partials.certifications')
        </div>
        <div class="bs-main">
            @include('resume-templates.partials.summary', ['title' => 'Profile'])
            @include('resume-templates.partials.experience')
            @include('resume-templates.partials.projects')
        </div>
    </div>
</div>
@endsection
