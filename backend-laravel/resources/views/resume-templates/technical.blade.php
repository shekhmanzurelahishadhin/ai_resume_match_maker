{{-- Technical — skills matrix first, monospace headings, tech tags on projects. --}}
@extends('resume-templates._base')

@section('styles')
.tc-header { padding-bottom: 12px; margin-bottom: 14px; border-bottom: 2px solid {{ $theme['primary'] }}; }
.tc-header .rm-name { font-size: 27px; }
.tc-header .rm-contact-line a { color: {{ $theme['primary'] }}; }
.rm-h { text-transform: none; letter-spacing: 0; font-size: 13px; color: {{ $theme['primary'] }}; }
.rm-matrix { border: 1px solid {{ $theme['tintStrong'] }}; }
.rm-matrix td { padding: 5px 8px; border-bottom: 1px solid {{ $theme['tint'] }}; }
td.rm-matrix-cat { width: 24%; background: {{ $theme['tint'] }}; font-family: {!! $theme['headingFont'] !!}; font-size: 0.9em; font-weight: 700; color: {{ $theme['primary'] }}; }
.rm-tech { font-family: {!! $theme['headingFont'] !!}; color: {{ $theme['primary'] }}; }
@endsection

@section('body')
<div class="rm-page">
    <header class="tc-header">
        <h1 class="rm-name">{{ $content['contact']['name'] }}</h1>
        @include('resume-templates.partials.contact-line')
    </header>

    @include('resume-templates.partials.summary', ['title' => '// summary'])
    @include('resume-templates.partials.skills', ['style' => 'matrix', 'title' => '// tech stack'])
    @include('resume-templates.partials.experience', ['title' => '// experience'])
    @include('resume-templates.partials.projects', ['title' => '// projects'])
    @include('resume-templates.partials.education', ['title' => '// education'])
    @include('resume-templates.partials.certifications', ['title' => '// certifications'])
</div>
@endsection
