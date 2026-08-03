<?php

namespace App\Policies;

use App\Models\Notification;
use App\Models\User;

class NotificationPolicy
{
    public function view(User $user, Notification $notification): bool
    {
        return $user->id === $notification->user_id;
    }

    public function markRead(User $user, Notification $notification): bool
    {
        return $user->id === $notification->user_id;
    }

    public function deleteDevice(User $user, string $token): bool
    {
        // Delegated to controller (it resolves the token row + checks user_id).
        return true;
    }
}
