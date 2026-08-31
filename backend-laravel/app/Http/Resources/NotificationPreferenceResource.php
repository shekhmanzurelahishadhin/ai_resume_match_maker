<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Notification preferences in the camelCase shape the API speaks.
 *
 * The columns are snake_case; without this resource the endpoint echoed raw
 * model attributes, so clients sent `dailyDigest` but read back `daily_digest`.
 */
class NotificationPreferenceResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'emailNotifications' => (bool) $this->email_notifications,
            'pushNotifications' => (bool) $this->push_notifications,
            'jobMatches' => (bool) $this->job_matches,
            'resumeAnalysis' => (bool) $this->resume_analysis,
            'newJobs' => (bool) $this->new_jobs,
            'dailyDigest' => (bool) $this->daily_digest,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
