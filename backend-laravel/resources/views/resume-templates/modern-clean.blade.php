{{--
  modern-clean — Minimalist single-column with clear typography hierarchy.
  Inherits the shared layout (resources/views/layouts/resume.blade.php).
  Per-template customization: emerald accent + generous spacing.
--}}
@extends('layouts.resume', [
    'meta' => [
        'slug' => 'modern-clean',
        'name' => 'Modern Clean',
        'colors' => ['primary' => '#059669', 'accent' => '#34d399', 'text' => '#1f2937'],
        'fonts' => [
            'heading' => "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
            'body' => "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        ],
    ],
])

@php
    // Override the page padding + name size for the modern-clean look.
@endphp
@section('head-extra')
<style>
.rm-page { padding: 48px; }
.rm-name { font-size: 30px; }
.rm-section { margin-top: 26px; }
.rm-section-title { border-bottom: 1px solid {{ $customization['primaryColor'] ?? '#059669' }}; }
</style>
@endsection
