{{-- Creative — full-width colour header band, accent rules, chips. --}}
@extends('resume-templates._base')

@section('styles')
.cr-band { background: {{ $theme['primary'] }}; color: {{ $theme['onPrimary'] }}; padding: 26px 28px 22px; margin-bottom: 20px; }
.cr-band .rm-name { font-size: 32px; color: {{ $theme['onPrimary'] }}; letter-spacing: -0.01em; }
.cr-band .rm-contact-line { color: {{ $theme['onPrimaryMuted'] }}; }
.cr-band .rm-contact-line .rm-sep { color: {{ $theme['onPrimaryMuted'] }}; }
.cr-band .rm-contact-line a { color: {{ $theme['onPrimary'] }}; }
.cr-accent { height: 4px; width: 64px; background: {{ $theme['accent'] }}; margin-top: 14px; }
.cr-body { padding: 0 28px; }
.rm-h { color: {{ $theme['primary'] }}; font-size: 12.5px; }
.rm-h { border-bottom: 2px solid {{ $theme['accent'] }}; padding-bottom: 3px; display: inline-block; }
.rm-summary p { font-size: 1.06em; color: {{ $theme['muted'] }}; }
.rm-experience .rm-item { border-left: 3px solid {{ $theme['tintStrong'] }}; padding-left: 10px; }
.rm-chip { background: {{ $theme['tint'] }}; color: {{ $theme['primary'] }}; }
@endsection

@section('body')
<div class="rm-page">
    <header class="cr-band">
        <h1 class="rm-name">{{ $content['contact']['name'] }}</h1>
        @include('resume-templates.partials.contact-line')
        <div class="cr-accent"></div>
    </header>

    <div class="cr-body">
        @include('resume-templates.partials.summary', ['title' => 'About me'])
        @include('resume-templates.partials.experience')
        @include('resume-templates.partials.projects', ['title' => 'Selected work'])
        @include('resume-templates.partials.skills', ['style' => 'chips'])
        @include('resume-templates.partials.education')
        @include('resume-templates.partials.certifications')
    </div>
</div>
@endsection
