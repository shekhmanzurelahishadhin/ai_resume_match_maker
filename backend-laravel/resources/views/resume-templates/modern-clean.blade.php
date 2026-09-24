{{-- Modern Clean — single column, accent bar, skill chips. --}}
@extends('resume-templates._base')

@section('styles')
.mc-bar { height: 5px; background: {{ $theme['primary'] }}; margin-bottom: 22px; }
.mc-header { padding-bottom: 14px; border-bottom: 1px solid {{ $theme['rule'] }}; margin-bottom: {{ $theme['sectionGap'] }}; }
.mc-header .rm-name { font-size: 28px; color: {{ $theme['text'] }}; }
.mc-header .rm-contact-line a { color: {{ $theme['primary'] }}; }
.rm-h { border-left: 3px solid {{ $theme['accent'] }}; padding-left: 8px; }
@endsection

@section('body')
<div class="rm-page">
    <div class="mc-bar"></div>
    <header class="mc-header">
        <h1 class="rm-name">{{ $content['contact']['name'] }}</h1>
        @include('resume-templates.partials.contact-line')
    </header>

    @include('resume-templates.partials.summary')
    @include('resume-templates.partials.experience')
    @include('resume-templates.partials.skills', ['style' => 'chips'])
    @include('resume-templates.partials.projects')
    @include('resume-templates.partials.education')
    @include('resume-templates.partials.certifications')
</div>
@endsection
