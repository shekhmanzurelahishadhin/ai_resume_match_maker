<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeImprovement extends Model
{
    use HasFactory;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'resume_id',
        'original_text',
        'improved_text',
        'suggestion_type',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class, 'resume_id');
    }

    protected static function booted(): void
    {
        static::creating(function (self $improvement) {
            if (empty($improvement->id)) {
                $improvement->id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }
}
