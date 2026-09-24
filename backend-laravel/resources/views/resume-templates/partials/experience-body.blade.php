@if ($exp['description'] !== '')
    <p class="rm-desc">{{ $exp['description'] }}</p>
@endif
@if (! empty($exp['bullets']))
<ul class="rm-bullets">
    @foreach ($exp['bullets'] as $bullet)
        <li>{{ $bullet }}</li>
    @endforeach
</ul>
@endif
