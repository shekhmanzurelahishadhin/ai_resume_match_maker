{{-- Contact details on one wrapping line, separated by dots. --}}
@php
    $c = $content['contact'];
    $parts = [];
    foreach (['email', 'phone', 'location'] as $k) {
        if ($c[$k] !== '') {
            $parts[] = ['text' => $c[$k], 'href' => null];
        }
    }
    foreach (['website', 'linkedin', 'github'] as $k) {
        if ($c[$k] !== '') {
            $parts[] = ['text' => $c[$k.'Label'], 'href' => $c[$k]];
        }
    }
@endphp
@if (! empty($parts))
<div class="rm-contact-line {{ $class ?? '' }}">
    @foreach ($parts as $i => $part)
        @if ($i > 0)
            <span class="rm-sep">·</span>
        @endif
        @if ($part['href'])
            <a href="{{ $part['href'] }}">{{ $part['text'] }}</a>
        @else
            <span>{{ $part['text'] }}</span>
        @endif
    @endforeach
</div>
@endif
