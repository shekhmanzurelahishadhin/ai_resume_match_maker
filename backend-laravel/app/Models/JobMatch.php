<?php

namespace App\Models;

use App\Enums\MatchSource;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobMatch extends Model
{
    use HasFactory;

    protected $table = 'matches';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'resume_id',
        'job_post_id',
        'recruiter_id',
        'match_percentage',
        'match_source',
        'matched_skills_json',
        'missing_skills_json',
        'analyzed_at',
    ];

    protected function casts(): array
    {
        return [
            'match_percentage' => 'float',
            'match_source' => MatchSource::class,
            'matched_skills_json' => 'array',
            'missing_skills_json' => 'array',
            'analyzed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class, 'resume_id');
    }

    public function jobPost(): BelongsTo
    {
        return $this->belongsTo(JobPost::class, 'job_post_id');
    }

    public function recruiter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recruiter_id');
    }

    public function getMatchedSkillsAttribute(): array
    {
        $skills = ($this->matched_skills_json ?? [])['skills'] ?? [];

        return is_array($skills) ? array_values(array_filter($skills, 'is_string')) : [];
    }

    public function getMissingSkillsAttribute(): array
    {
        $skills = ($this->missing_skills_json ?? [])['skills'] ?? [];

        return is_array($skills) ? array_values(array_filter($skills, 'is_string')) : [];
    }

    protected static function booted(): void
    {
        static::creating(function (self $match) {
            if (empty($match->id)) {
                $match->id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }
}
