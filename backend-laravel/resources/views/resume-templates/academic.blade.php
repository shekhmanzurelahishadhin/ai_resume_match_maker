{{-- Academic — centred serif header, education first, understated headings. --}}
@extends('resume-templates._base')

@section('styles')
.ac-header { text-align: center; margin-bottom: 18px; }
.ac-header .rm-name { font-size: 26px; font-weight: 400; letter-spacing: 0.03em; color: {{ $theme['text'] }}; }
.ac-header .rm-contact-line { text-align: center; font-size: 0.95em; }
.ac-header .rm-contact-line a { color: {{ $theme['primary'] }}; }
.rm-h { text-transform: none; letter-spacing: 0.02em; font-size: 14px; font-weight: 700; color: {{ $theme['primary'] }}; border-bottom: 1px solid {{ $theme['accent'] }}; padding-bottom: 3px; }
.rm-title { font-weight: 700; }
.rm-sub { font-style: italic; }
@endsection

@section('body')
<div class="rm-page">
    <header class="ac-header">
        <h1 class="rm-name">{{ $content['contact']['name'] }}</h1>
        @include('resume-templates.partials.contact-line')
    </header>

    @include('resume-templates.partials.summary', ['title' => 'Research interests'])
    @include('resume-templates.partials.education')
    @include('resume-templates.partials.experience', ['title' => 'Research & professional experience'])
    @include('resume-templates.partials.projects', ['title' => 'Selected projects'])
    @include('resume-templates.partials.certifications', ['title' => 'Honours & certifications'])
    @include('resume-templates.partials.skills', ['style' => 'rows'])
</div>
@endsection
