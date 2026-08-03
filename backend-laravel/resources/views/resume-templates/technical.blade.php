{{--
  technical — Skills-forward layout emphasizing tech stack.
  Inherits the shared layout.
--}}
@extends('layouts.resume', [
    'meta' => [
        'slug' => 'technical',
        'name' => 'Technical',
        'colors' => ['primary' => '#0891b2', 'accent' => '#22d3ee', 'text' => '#1f2937'],
        'fonts' => [
            'heading' => "'Helvetica Neue', Arial, sans-serif",
            'body' => "'SFMono-Regular', Menlo, Monaco, Consolas, monospace",
        ],
    ],
])

@section('head-extra')
<style>
.rm-page { padding: 40px; }
.rm-name { font-size: 26px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.rm-section-title { font-family: 'Helvetica Neue', Arial, sans-serif; }
.rm-skill-group, .rm-skill-items, .rm-bullets li { font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, monospace; font-size: 12px; }
.rm-section.rm-skills { order: -1; }
</style>
@endsection
