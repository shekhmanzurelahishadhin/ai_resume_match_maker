{{-- Contact details one per line — for sidebars. --}}
@php
    $c = $content['contact'];
@endphp
<div class="rm-contact-stack">
    @if ($c['email'] !== '')
        <div>{{ $c['email'] }}</div>
    @endif
    @if ($c['phone'] !== '')
        <div>{{ $c['phone'] }}</div>
    @endif
    @if ($c['location'] !== '')
        <div>{{ $c['location'] }}</div>
    @endif
    @if ($c['website'] !== '')
        <div><a href="{{ $c['website'] }}">{{ $c['websiteLabel'] }}</a></div>
    @endif
    @if ($c['linkedin'] !== '')
        <div><a href="{{ $c['linkedin'] }}">{{ $c['linkedinLabel'] }}</a></div>
    @endif
    @if ($c['github'] !== '')
        <div><a href="{{ $c['github'] }}">{{ $c['githubLabel'] }}</a></div>
    @endif
</div>
