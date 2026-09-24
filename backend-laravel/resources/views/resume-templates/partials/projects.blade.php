@if (! empty($content['projects']))
<section class="rm-section rm-projects">
    <h2 class="rm-h">{{ $title ?? 'Projects' }}</h2>
    @foreach ($content['projects'] as $proj)
        <div class="rm-item">
            <table class="rm-row">
                <tr>
                    <td><span class="rm-title">{{ $proj['name'] }}</span></td>
                    @if ($proj['url'] !== '')
                        <td class="rm-right"><a class="rm-link" href="{{ $proj['url'] }}">{{ $proj['urlLabel'] }}</a></td>
                    @endif
                </tr>
            </table>
            @if ($proj['description'] !== '')
                <p class="rm-desc">{{ $proj['description'] }}</p>
            @endif
            @if (! empty($proj['technologies']))
                <div class="rm-tech">{{ implode(' · ', $proj['technologies']) }}</div>
            @endif
        </div>
    @endforeach
</section>
@endif
