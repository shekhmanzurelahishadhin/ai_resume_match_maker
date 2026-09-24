<?php

namespace App\Enums;

/**
 * Hiring pipeline for a job application. Recruiters move an application
 * between the review stages; only the seeker can withdraw.
 */
enum ApplicationStatus: string
{
    case Applied = 'applied';
    case Reviewing = 'reviewing';
    case Shortlisted = 'shortlisted';
    case Interview = 'interview';
    case Offered = 'offered';
    case Hired = 'hired';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';

    /** Stages a recruiter may set. */
    public static function recruiterSettable(): array
    {
        return array_map(
            fn (self $s) => $s->value,
            array_filter(self::cases(), fn (self $s) => $s !== self::Withdrawn),
        );
    }

    public function label(): string
    {
        return match ($this) {
            self::Applied => 'Applied',
            self::Reviewing => 'Under review',
            self::Shortlisted => 'Shortlisted',
            self::Interview => 'Interview',
            self::Offered => 'Offer made',
            self::Hired => 'Hired',
            self::Rejected => 'Not selected',
            self::Withdrawn => 'Withdrawn',
        };
    }
}
