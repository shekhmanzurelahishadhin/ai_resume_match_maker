<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobPost extends Model
{
    use HasFactory;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $table = 'job_posts';

    protected $fillable = [
        'recruiter_id',
        'title',
        'description',
        'required_skills_json',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'required_skills_json' => 'array',
            'is_active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function recruiter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recruiter_id');
    }

    public function matches(): HasMany
    {
        return $this->hasMany(JobMatch::class, 'job_post_id');
    }

    public function getRequiredSkillsAttribute(): array
    {
        if (! is_array($this->required_skills_json)) {
            return [];
        }
        $skills = $this->required_skills_json['skills'] ?? [];

        return is_array($skills) ? array_values(array_filter($skills, 'is_string')) : [];
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('is_active', true);
    }

    protected static function booted(): void
    {
        static::creating(function (self $job) {
            if (empty($job->id)) {
                $job->id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }
}
