{{--
  $layout: 'stacked' (default) — dates right-aligned on the title row
           'gutter'            — dates in a narrow left column (timeline)
--}}
@if (! empty($content['experience']))
<section class="rm-section rm-experience">
    <h2 class="rm-h">{{ $title ?? 'Experience' }}</h2>
    @foreach ($content['experience'] as $exp)
        <div class="rm-item">
            @if (($layout ?? 'stacked') === 'gutter')
                <table class="rm-row">
                    <tr>
                        <td class="rm-gutter rm-date">{{ $exp['dates'] }}</td>
                        <td>
                            <div class="rm-title">{{ $exp['position'] }}</div>
                            @if ($exp['company'] !== '')
                                <div class="rm-sub">{{ $exp['company'] }}</div>
                            @endif
                            @include('resume-templates.partials.experience-body', ['exp' => $exp])
                        </td>
                    </tr>
                </table>
            @else
                <table class="rm-row">
                    <tr>
                        <td>
                            <span class="rm-title">{{ $exp['position'] }}</span>
                            @if ($exp['company'] !== '')
                                <span class="rm-sub"> · {{ $exp['company'] }}</span>
                            @endif
                        </td>
                        @if ($exp['dates'] !== '')
                            <td class="rm-right rm-date">{{ $exp['dates'] }}</td>
                        @endif
                    </tr>
                </table>
                @include('resume-templates.partials.experience-body', ['exp' => $exp])
            @endif
        </div>
    @endforeach
</section>
@endif
