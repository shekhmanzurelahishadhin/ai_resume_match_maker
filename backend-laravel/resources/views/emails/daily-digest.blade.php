@php
    /** @var \App\Models\User $user */
    /** @var \Illuminate\Support\Collection $items */
    /** @var int $unread */
@endphp
@component('mail::message')
# Your daily digest — {{ config('app.name', 'Resume Matchmaker') }}

Hi {{ $user->name }},

Here's a summary of your activity in the last 24 hours.

**Unread notifications:** {{ $unread }}

@if($items->isEmpty())
No new notifications today.
@else
Recent notifications:

@foreach($items->take(10) as $item)
- **{{ $item->title }}**: {{ $item->body }}
@endforeach

@if($items->count() > 10)
...and {{ $items->count() - 10 }} more.
@endif
@endif

@component('mail::button', ['url' => url('/dashboard')])
Open Resume Matchmaker
@endcomponent

You can disable daily digests in your [notification preferences]({{ url('/settings/notifications') }}).

Thanks,<br>
{{ config('app.name', 'Resume Matchmaker') }}
@endcomponent
