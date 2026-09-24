@if ($content['summary'] !== '')
<section class="rm-section rm-summary">
    <h2 class="rm-h">{{ $title ?? 'Summary' }}</h2>
    <p>{{ $content['summary'] }}</p>
</section>
@endif
