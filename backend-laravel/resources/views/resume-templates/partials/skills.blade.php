{{--
  $style: 'rows'    (default) Category: a, b, c
          'chips'   every skill as a pill, grouped by category
          'matrix'  two-column table, category | skills
          'stacked' category label with skills beneath — for narrow sidebars
--}}
@if (! empty($content['skills']))
@php
    $skillStyle = $style ?? 'rows';
@endphp
<section class="rm-section rm-skills">
    <h2 class="rm-h">{{ $title ?? 'Skills' }}</h2>
    @if ($skillStyle === 'chips')
        @foreach ($content['skills'] as $group)
            <div class="rm-skill-group">
                @if ($group['category'] !== '')
                    <div class="rm-skill-group-label">{{ $group['category'] }}</div>
                @endif
                @foreach ($group['items'] as $item)
                    <span class="rm-chip">{{ $item }}</span>
                @endforeach
            </div>
        @endforeach
    @elseif ($skillStyle === 'matrix')
        <table class="rm-grid rm-matrix">
            @foreach ($content['skills'] as $group)
                <tr>
                    <td class="rm-matrix-cat">{{ $group['category'] }}</td>
                    <td class="rm-matrix-items">{{ implode(', ', $group['items']) }}</td>
                </tr>
            @endforeach
        </table>
    @elseif ($skillStyle === 'stacked')
        @foreach ($content['skills'] as $group)
            <div class="rm-skill-group">
                @if ($group['category'] !== '')
                    <div class="rm-skill-group-label">{{ $group['category'] }}</div>
                @endif
                <div>{{ implode(', ', $group['items']) }}</div>
            </div>
        @endforeach
    @else
        @foreach ($content['skills'] as $group)
            <div class="rm-skill-row">
                @if ($group['category'] !== '')
                    <span class="rm-skill-cat">{{ $group['category'] }}:</span>
                @endif
                <span>{{ implode(', ', $group['items']) }}</span>
            </div>
        @endforeach
    @endif
</section>
@endif
