<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    use HasFactory;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'email_notifications',
        'push_notifications',
        'job_matches',
        'resume_analysis',
        'new_jobs',
        'daily_digest',
    ];

    protected function casts(): array
    {
        return [
            'email_notifications' => 'boolean',
            'push_notifications' => 'boolean',
            'job_matches' => 'boolean',
            'resume_analysis' => 'boolean',
            'new_jobs' => 'boolean',
            'daily_digest' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The default preferences (per §7): all true except daily_digest.
     */
    public static function defaults(): array
    {
        return [
            'email_notifications' => true,
            'push_notifications' => true,
            'job_matches' => true,
            'resume_analysis' => true,
            'new_jobs' => true,
            'daily_digest' => false,
        ];
    }

    public static function getOrCreateFor(User $user): self
    {
        return $user->notificationPreference ?? self::create(array_merge(
            ['user_id' => $user->id],
            self::defaults()
        ));
    }

    protected static function booted(): void
    {
        static::creating(function (self $pref) {
            if (empty($pref->id)) {
                $pref->id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }
}
