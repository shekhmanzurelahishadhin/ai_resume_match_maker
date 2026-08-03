{{--
  academic — Citation-friendly format for researchers and academics.
  Inherits the shared layout.
--}}
@extends('layouts.resume', [
    'meta' => [
        'slug' => 'academic',
        'name' => 'Academic',
        'colors' => ['primary' => '#1f2937', 'accent' => '#6b7280', 'text' => '#111827'],
        'fonts' => [
            'heading' => "Georgia, 'Times New Roman', serif",
            'body' => "Georgia, 'Times New Roman', serif",
        ],
    ],
])

@section('head-extra')
<style>
.rm-page { padding: 48px; max-width: 720px; }
.rm-name { font-size: 22px; text-align: center; margin-bottom: 2px; }
.rm-contact-links { justify-content: center; text-align: center; }
.rm-section { margin-top: 20px; }
.rm-section-title { font-size: 12px; text-align: left; border-bottom: 1px solid #d1d5db; }
.rm-bullets { list-style-type: square; }
</style>
@endsection
