@if (! empty($content['certifications']))
<section class="rm-section rm-certifications">
    <h2 class="rm-h">{{ $title ?? 'Certifications' }}</h2>
    @foreach ($content['certifications'] as $cert)
        @php
            $certMeta = implode(' · ', array_filter([$cert['issuer'], $cert['date']]));
        @endphp
        <div class="rm-item">
            <div class="rm-title">{{ $cert['name'] }}</div>
            @if ($certMeta !== '')
                <div class="rm-sub">{{ $certMeta }}</div>
            @endif
        </div>
    @endforeach
</section>
@endif
