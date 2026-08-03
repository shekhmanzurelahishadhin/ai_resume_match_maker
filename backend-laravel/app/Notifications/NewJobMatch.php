<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification as LaravelNotification;

class NewJobMatch extends LaravelNotification
{
    use Queueable;

    public function __construct(public \App\Models\Notification $notification) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $data = is_array($this->notification->data_json) ? $this->notification->data_json : [];
        $url = $data['url'] ?? '/matches';

        return (new MailMessage())
            ->subject($this->notification->title)
            ->line($this->notification->body)
            ->action('View matches', url((string) $url));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'notification_id' => $this->notification->id,
            'title' => $this->notification->title,
            'body' => $this->notification->body,
        ];
    }
}
