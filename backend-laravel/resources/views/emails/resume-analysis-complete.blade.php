@php
    /** @var \App\Models\Notification $notification */
@endphp
@component('mail::message')
# {{ $notification->title }}

{{ $notification->body }}

@isset($notification->data_json['url'])
@component('mail::button', ['url' => url($notification->data_json['url'])])
View dashboard
@endcomponent
@endisset

Thanks,<br>
{{ config('app.name', 'Resume Matchmaker') }}
@endcomponent
