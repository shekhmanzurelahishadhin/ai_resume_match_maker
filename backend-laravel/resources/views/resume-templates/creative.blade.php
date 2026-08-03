{{--
  creative — Bold accents and asymmetric layout for design roles.
  Inherits the shared layout.
--}}
@extends('layouts.resume', [
    'meta' => [
        'slug' => 'creative',
        'name' => 'Creative',
        'colors' => ['primary' => '#9333ea', 'accent' => '#ec4899', 'text' => '#1f2937'],
        'fonts' => [
            'heading' => "'Helvetica Neue', Helvetica, Arial, sans-serif",
            'body' => "'Helvetica Neue', Helvetica, Arial, sans-serif",
        ],
    ],
])

@section('head-extra')
<style>
.rm-page { padding: 44px; position: relative; }
.rm-page::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 6px; height: 100%;
    background: linear-gradient(180deg, {{ $customization['primaryColor'] ?? '#9333ea' }}, {{ $meta['colors']['accent'] ?? '#ec4899' }});
}
.rm-name { font-size: 32px; color: {{ $customization['primaryColor'] ?? '#9333ea' }}; }
.rm-section-title { border-bottom: 2px solid {{ $meta['colors']['accent'] ?? '#ec4899' }}; }
</style>
@endsection
