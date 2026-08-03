<?php

namespace App\Models;

use App\Enums\ResumeStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Resume extends Model
{
    use HasFactory;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'file_name',
        'file_path',
        'mime_type',
        'file_size_bytes',
        'extracted_text',
        'skills_json',
        'experience_years',
        'status',
        'parse_error',
    ];

    protected $hidden = [
        'extracted_text', // §5 privacy — never expose the raw text via serialization
    ];

    protected function casts(): array
    {
        return [
            'skills_json' => 'array',
            'experience_years' => 'float',
            'file_size_bytes' => 'integer',
            'status' => ResumeStatus::class,
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function matches(): HasMany
    {
        return $this->hasMany(JobMatch::class, 'resume_id');
    }

    public function generatedResumes(): HasMany
    {
        return $this->hasMany(GeneratedResume::class, 'original_resume_id');
    }

    public function improvements(): HasMany
    {
        return $this->hasMany(ResumeImprovement::class, 'resume_id');
    }

    /**
     * Convenience accessor: the flat list of skill labels.
     */
    public function getSkillsListAttribute(): array
    {
        if (! is_array($this->skills_json)) {
            return [];
        }

        $skills = $this->skills_json['skills'] ?? [];

        return is_array($skills) ? array_values(array_filter($skills, 'is_string')) : [];
    }

    public function scopeReady(Builder $q): Builder
    {
        return $q->where('status', ResumeStatus::Ready)->whereNotNull('extracted_text');
    }

    protected static function booted(): void
    {
        static::creating(function (self $resume) {
            if (empty($resume->id)) {
                $resume->id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }
}
