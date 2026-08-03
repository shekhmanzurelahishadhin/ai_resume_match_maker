<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GeneratedResume extends Model
{
    use HasFactory;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'original_resume_id',
        'template_id',
        'content_json',
        'customization_json',
        'file_path_pdf',
        'file_path_docx',
        'file_path_html',
        'version',
        'is_current',
    ];

    protected function casts(): array
    {
        return [
            'content_json' => 'array',
            'customization_json' => 'array',
            'version' => 'integer',
            'is_current' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function originalResume(): BelongsTo
    {
        return $this->belongsTo(Resume::class, 'original_resume_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ResumeTemplate::class, 'template_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(ResumeVersion::class, 'generated_resume_id')
            ->orderBy('version_number', 'desc');
    }

    public function scopeCurrent(Builder $q): Builder
    {
        return $q->where('is_current', true);
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
