<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Privacy-safe recruiter view of a candidate (§5).
 *
 * NEVER exposes: extracted_text, full skills_json, file_path, the candidate's
 * email, or any other PII beyond the candidate's display name. The shape is:
 *   - candidate { id, name }                  (or anonymized if seeker opted out)
 *   - experienceYears                         (float, heuristic)
 *   - skills                                   (list of strings — derived from skills_json.skills)
 *   - matchedSkills                            (list)
 *   - missingSkills                            (list)
 *   - matchPercentage                          (float)
 *   - matchSource                              ('ai' | 'fallback')
 *   - analyzedAt                               (ISO timestamp)
 */
class CandidateResource extends JsonResource
{
    public function toArray($request): array
    {
        $resume = $this->resume;
        $skillsJson = is_array($resume->skills_json) ? $resume->skills_json : ['skills' => []];

        return [
            'matchId' => $this->id,
            'matchPercentage' => (float) $this->match_percentage,
            'matchSource' => $this->match_source instanceof \App\Enums\MatchSource ? $this->match_source->value : (string) $this->match_source,
            'matchedSkills' => $this->matched_skills,
            'missingSkills' => $this->missing_skills,
            'analyzedAt' => $this->analyzed_at?->toIso8601String(),
            'application' => $this->getAttribute('application_info'),
            'conversationId' => $this->getAttribute('conversation_id'),
            'resume' => [
                'id' => $resume->id,
                'fileName' => $resume->file_name,
                'experienceYears' => $resume->experience_years,
                'skills' => $skillsJson['skills'] ?? [],
                'status' => $resume->status instanceof \App\Enums\ResumeStatus ? $resume->status->value : (string) $resume->status,
                'candidate' => [
                    'id' => $resume->user?->id,
                    'name' => $resume->user?->name,
                ],
            ],
        ];
    }
}
