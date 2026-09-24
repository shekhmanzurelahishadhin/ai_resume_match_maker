{{-- Executive — centred serif header, boxed profile, dense body, skills matrix. --}}
@extends('resume-templates._base')

@section('styles')
.ex-header { text-align: center; padding: 10px 0 12px; border-top: 3px double {{ $theme['primary'] }}; border-bottom: 3px double {{ $theme['primary'] }}; margin-bottom: 16px; }
.ex-header .rm-name { font-size: 27px; text-transform: uppercase; letter-spacing: 0.12em; color: {{ $theme['primary'] }}; }
.ex-header .rm-contact-line { text-align: center; }
.ex-profile { background: {{ $theme['tint'] }}; border-left: 4px solid {{ $theme['accent'] }}; padding: 10px 14px; }
.ex-profile .rm-h { margin-bottom: 5px; }
.rm-h { color: {{ $theme['primary'] }}; border-bottom: 1px solid {{ $theme['primary'] }}; padding-bottom: 3px; }
.rm-item { margin-bottom: 8px; }
.rm-matrix td { padding: 3px 0; border-bottom: 1px solid {{ $theme['rule'] }}; }
td.rm-matrix-cat { width: 26%; font-weight: 700; color: {{ $theme['primary'] }}; }
@endsection

@section('body')
<div class="rm-page">
    <header class="ex-header">
        <h1 class="rm-name">{{ $content['contact']['name'] }}</h1>
        @include('resume-templates.partials.contact-line')
    </header>

    @if ($content['summary'] !== '')
        <div class="ex-profile">
            @include('resume-templates.partials.summary', ['title' => 'Executive profile'])
        </div>
    @endif
    @include('resume-templates.partials.experience', ['title' => 'Professional experience'])
    @include('resume-templates.partials.skills', ['style' => 'matrix', 'title' => 'Core competencies'])
    @include('resume-templates.partials.education')
    @include('resume-templates.partials.projects', ['title' => 'Key initiatives'])
    @include('resume-templates.partials.certifications')
</div>
@endsection
