<?php

namespace App\Http\Requests\Job;

/**
 * Validation shared by job create and update. `$presence` is "required" or
 * "sometimes" for the title and description.
 */
final class JobRules
{
    public const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'internship'];

    public const WORK_MODES = ['onsite', 'remote', 'hybrid'];

    public const EXPERIENCE_LEVELS = ['entry', 'mid', 'senior', 'lead'];

    public static function rules(string $presence): array
    {
        return [
            'title' => [$presence, 'string', 'min:3', 'max:200'],
            'description' => [$presence, 'string', 'min:10', 'max:8000'],
            'company' => ['sometimes', 'nullable', 'string', 'max:160'],
            'location' => ['sometimes', 'nullable', 'string', 'max:160'],
            'employmentType' => ['sometimes', 'nullable', 'in:'.implode(',', self::EMPLOYMENT_TYPES)],
            'workMode' => ['sometimes', 'nullable', 'in:'.implode(',', self::WORK_MODES)],
            'experienceLevel' => ['sometimes', 'nullable', 'in:'.implode(',', self::EXPERIENCE_LEVELS)],
            'salaryRange' => ['sometimes', 'nullable', 'string', 'max:80'],
            'requiredSkills' => ['sometimes', 'array', 'max:40'],
            'requiredSkills.*' => ['string', 'max:80'],
            'isActive' => ['sometimes', 'boolean'],
        ];
    }

    /** Map validated camelCase input onto job_posts columns. */
    public static function toAttributes(array $data): array
    {
        $map = [
            'company' => 'company',
            'location' => 'location',
            'employmentType' => 'employment_type',
            'workMode' => 'work_mode',
            'experienceLevel' => 'experience_level',
            'salaryRange' => 'salary_range',
        ];
        $out = [];
        foreach (['title', 'description'] as $key) {
            if (array_key_exists($key, $data)) {
                $out[$key] = trim($data[$key]);
            }
        }
        foreach ($map as $in => $column) {
            if (array_key_exists($in, $data)) {
                $value = is_string($data[$in]) ? trim($data[$in]) : $data[$in];
                $out[$column] = $value === '' ? null : $value;
            }
        }
        if (array_key_exists('requiredSkills', $data)) {
            $skills = array_values(array_unique(array_filter(array_map('trim', $data['requiredSkills']))));
            $out['required_skills_json'] = ['skills' => $skills];
        }
        if (array_key_exists('isActive', $data)) {
            $out['is_active'] = (bool) $data['isActive'];
        }

        return $out;
    }
}
