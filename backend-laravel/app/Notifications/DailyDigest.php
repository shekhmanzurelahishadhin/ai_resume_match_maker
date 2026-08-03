<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification as LaravelNotification;
use Illuminate\Support\Collection;

class DailyDigest extends LaravelNotification implements ShouldQueue
{
    use Queueable;

    /**
     * @param Collection<int, \App\Models\Notification> $items
     */
    public function __construct(
        public User $user,
        public Collection $items,
        public int $unread,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage())
            ->subject('Your daily digest — Resume Matchmaker')
            ->greeting("Hi {$this->user->name},")
            ->line("Here's a summary of your activity in the last 24 hours.")
            ->line("Unread notifications: **{$this->unread}**");

        if ($this->items->isEmpty()) {
            $mail->line('No new notifications today.');
        } else {
            $mail->line('Recent notifications:');
            foreach ($this->items->take(10) as $item) {
                $mail->line("• {$item->title}: {$item->body}");
            }
            if ($this->items->count() > 10) {
                $mail->line('...and '.($this->items->count() - 10).' more.');
            }
        }

        return $mail->action('Open Resume Matchmaker', url('/dashboard'))
            ->line('You can disable daily digests in your notification preferences.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'items_count' => $this->items->count(),
            'unread' => $this->unread,
        ];
    }
}
