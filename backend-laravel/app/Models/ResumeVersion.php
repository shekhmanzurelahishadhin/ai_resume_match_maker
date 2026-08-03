<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeVersion extends Model
{
    use HasFactory;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'generated_resume_id',
        'version_number',
        'content_json',
    ];

    protected function casts(): array
    {
        return [
            'content_json' => 'array',
            'version_number' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function generatedResume(): BelongsTo
    {
        return $this->belongsTo(GeneratedResume::class, 'generated_resume_id');
    }

    protected static function booted(): void
    {
        static::creating(function (self $version) {
            if (empty($version->id)) {
                $version->id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }
}
