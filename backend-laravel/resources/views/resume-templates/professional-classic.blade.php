{{--
  professional-classic — Traditional serif, conservative, traditional.
  Inherits the shared layout.
--}}
@extends('layouts.resume', [
    'meta' => [
        'slug' => 'professional-classic',
        'name' => 'Professional Classic',
        'colors' => ['primary' => '#1e3a5f', 'accent' => '#3b82f6', 'text' => '#1f2937'],
        'fonts' => [
            'heading' => "Georgia, 'Times New Roman', serif",
            'body' => "Georgia, 'Times New Roman', serif",
        ],
    ],
])

@section('head-extra')
<style>
.rm-page { padding: 40px; border-top: 4px solid {{ $customization['primaryColor'] ?? '#1e3a5f' }}; }
.rm-name { font-size: 26px; letter-spacing: 0.01em; }
.rm-section { margin-top: 24px; }
.rm-section-title { letter-spacing: 0.04em; }
</style>
@endsection
