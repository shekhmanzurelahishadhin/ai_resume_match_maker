<?php

namespace App\Models;

use App\Enums\ApplicationStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplication extends Model
{
    use HasUuids;

    protected $fillable = [
        'job_post_id',
        'seeker_id',
        'resume_id',
        'generated_resume_id',
        'cover_letter',
        'status',
        'match_percentage',
        'status_changed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => ApplicationStatus::class,
            'match_percentage' => 'float',
            'status_changed_at' => 'datetime',
        ];
    }

    public function jobPost(): BelongsTo
    {
        return $this->belongsTo(JobPost::class, 'job_post_id');
    }

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seeker_id');
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class, 'resume_id');
    }

    public function generatedResume(): BelongsTo
    {
        return $this->belongsTo(GeneratedResume::class, 'generated_resume_id');
    }
}
