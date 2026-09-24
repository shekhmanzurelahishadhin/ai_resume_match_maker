{{-- Minimal — generous whitespace, dates in a left timeline gutter. --}}
@extends('resume-templates._base')

@section('styles')
.mn-header { margin-bottom: 26px; }
.mn-header .rm-name { font-size: 30px; font-weight: 300; letter-spacing: 0.01em; color: {{ $theme['primary'] }}; }
.mn-header .rm-contact-line { color: {{ $theme['faint'] }}; }
.rm-h { font-size: 10.5px; font-weight: 600; letter-spacing: 0.18em; color: {{ $theme['faint'] }}; margin-bottom: 10px; }
.rm-section { margin-top: 24px; padding-top: 14px; border-top: 1px solid {{ $theme['rule'] }}; }
.rm-section:first-child { border-top: 0; padding-top: 0; }
td.rm-gutter { width: 118px; padding-right: 14px; color: {{ $theme['faint'] }}; }
.rm-title { font-weight: 600; color: {{ $theme['primary'] }}; }
.rm-item { margin-bottom: 14px; }
@endsection

@section('body')
<div class="rm-page">
    <header class="mn-header">
        <h1 class="rm-name">{{ $content['contact']['name'] }}</h1>
        @include('resume-templates.partials.contact-line')
    </header>

    @include('resume-templates.partials.summary', ['title' => 'About'])
    @include('resume-templates.partials.experience', ['layout' => 'gutter'])
    @include('resume-templates.partials.education', ['layout' => 'gutter'])
    @include('resume-templates.partials.projects')
    @include('resume-templates.partials.skills', ['style' => 'rows'])
    @include('resume-templates.partials.certifications')
</div>
@endsection
