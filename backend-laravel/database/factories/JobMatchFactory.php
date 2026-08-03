<?php

namespace Database\Factories;

use App\Models\JobPost;
use App\Models\JobMatch;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\JobMatch>
 */
class JobMatchFactory extends Factory
{
    public function definition(): array
    {
        return [
            'match_percentage' => fake()->randomFloat(2, 0, 100),
            'match_source' => fake()->randomElement(['ai', 'fallback']),
            'matched_skills_json' => ['skills' => ['JavaScript', 'React']],
            'missing_skills_json' => ['skills' => ['Python']],
            'analyzed_at' => now(),
        ];
    }

    /**
     * Wire up the FK relationships — call after creating the resume + job.
     *
     *   JobMatch::factory()->forResume($resume)->forJob($job)->create();
     */
    public function forResume(Resume $resume): self
    {
        return $this->state(fn () => ['resume_id' => $resume->id]);
    }

    public function forJob(JobPost $job): self
    {
        return $this->state(fn () => [
            'job_post_id' => $job->id,
            'recruiter_id' => $job->recruiter_id,
        ]);
    }

    public function configure(): static
    {
        return $this->afterMaking(function (JobMatch $match) {
            // If resume/job/recruiter weren't set explicitly, create them.
            if (! $match->resume_id) {
                $match->resume_id = Resume::factory()->create()->id;
            }
            if (! $match->job_post_id) {
                $job = JobPost::factory()->create();
                $match->job_post_id = $job->id;
                $match->recruiter_id ??= $job->recruiter_id;
            }
            if (! $match->recruiter_id) {
                $match->recruiter_id = User::factory()->recruiter()->create()->id;
            }
        });
    }
}
