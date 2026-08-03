<?php

namespace App\Enums;

enum UserRole: string
{
    case Seeker = 'seeker';
    case Recruiter = 'recruiter';

    public function label(): string
    {
        return match ($this) {
            self::Seeker => 'Job Seeker',
            self::Recruiter => 'Recruiter',
        };
    }

    public static function fromValue(?string $value): self
    {
        return self::tryFrom($value ?? '') ?? self::Seeker;
    }
}
