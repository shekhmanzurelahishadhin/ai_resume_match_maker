{{--
  executive — Compact, dense, executive-level format with summary on top.
  Inherits the shared layout.
--}}
@extends('layouts.resume', [
    'meta' => [
        'slug' => 'executive',
        'name' => 'Executive',
        'colors' => ['primary' => '#0f172a', 'accent' => '#475569', 'text' => '#1f2937'],
        'fonts' => [
            'heading' => "'Times New Roman', Georgia, serif",
            'body' => "'Helvetica Neue', Arial, sans-serif",
        ],
    ],
])

@section('head-extra')
<style>
.rm-page { padding: 36px; }
.rm-name { font-size: 24px; letter-spacing: 0.04em; text-transform: uppercase; }
.rm-section { margin-top: 18px; }
.rm-section-title { font-size: 12px; letter-spacing: 0.08em; }
.rm-exp-item { margin-bottom: 8px; }
</style>
@endsection
