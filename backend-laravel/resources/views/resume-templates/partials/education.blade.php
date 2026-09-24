{{-- $layout: 'stacked' (default) | 'gutter' | 'compact' (sidebars: no date column) --}}
@if (! empty($content['education']))
<section class="rm-section rm-education">
    <h2 class="rm-h">{{ $title ?? 'Education' }}</h2>
    @foreach ($content['education'] as $edu)
        @php
            $degree = implode(', ', array_filter([$edu['degree'], $edu['field']]));
            $layoutMode = $layout ?? 'stacked';
        @endphp
        <div class="rm-item">
            @if ($layoutMode === 'gutter')
                <table class="rm-row">
                    <tr>
                        <td class="rm-gutter rm-date">{{ $edu['dates'] }}</td>
                        <td>
                            <div class="rm-title">{{ $edu['institution'] }}</div>
                            @if ($degree !== '')
                                <div class="rm-sub">{{ $degree }}</div>
                            @endif
                            @if ($edu['gpa'] !== '')
                                <div class="rm-date">GPA {{ $edu['gpa'] }}</div>
                            @endif
                        </td>
                    </tr>
                </table>
            @elseif ($layoutMode === 'compact')
                <div class="rm-title">{{ $edu['institution'] }}</div>
                @if ($degree !== '')
                    <div class="rm-sub">{{ $degree }}</div>
                @endif
                @if ($edu['dates'] !== '')
                    <div class="rm-date">{{ $edu['dates'] }}</div>
                @endif
                @if ($edu['gpa'] !== '')
                    <div class="rm-date">GPA {{ $edu['gpa'] }}</div>
                @endif
            @else
                <table class="rm-row">
                    <tr>
                        <td><span class="rm-title">{{ $edu['institution'] }}</span></td>
                        @if ($edu['dates'] !== '')
                            <td class="rm-right rm-date">{{ $edu['dates'] }}</td>
                        @endif
                    </tr>
                </table>
                @php
                    $eduLine = implode(' · ', array_filter([$degree, $edu['gpa'] !== '' ? 'GPA '.$edu['gpa'] : '']));
                @endphp
                @if ($eduLine !== '')
                    <div class="rm-sub">{{ $eduLine }}</div>
                @endif
            @endif
        </div>
    @endforeach
</section>
@endif
