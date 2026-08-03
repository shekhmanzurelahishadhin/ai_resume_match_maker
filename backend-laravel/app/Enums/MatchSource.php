<?php

namespace App\Enums;

enum MatchSource: string
{
    case Ai = 'ai';
    case Fallback = 'fallback';

    public function label(): string
    {
        return match ($this) {
            self::Ai => 'AI-verified',
            self::Fallback => 'Estimated',
        };
    }
}
