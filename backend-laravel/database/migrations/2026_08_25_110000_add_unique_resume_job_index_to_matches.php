<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A resume/job pair can only have one match.
 *
 * Both matching directions write to this table — ParseResumeAndMatch scores a
 * resume against every job, MatchResumeAgainstJobs scores a job against every
 * resume — so a seeker uploading while a recruiter posts produced two rows for
 * the same pair, and the duplicate showed up in the candidate and match lists.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Collapse existing duplicates, keeping the most recently analyzed row.
        $duplicates = DB::table('matches')
            ->select('resume_id', 'job_post_id')
            ->groupBy('resume_id', 'job_post_id')
            ->havingRaw('count(*) > 1')
            ->get();

        foreach ($duplicates as $pair) {
            $keep = DB::table('matches')
                ->where('resume_id', $pair->resume_id)
                ->where('job_post_id', $pair->job_post_id)
                ->orderByDesc('analyzed_at')
                ->orderByDesc('created_at')
                ->value('id');

            DB::table('matches')
                ->where('resume_id', $pair->resume_id)
                ->where('job_post_id', $pair->job_post_id)
                ->where('id', '!=', $keep)
                ->delete();
        }

        Schema::table('matches', function (Blueprint $table) {
            $table->unique(['resume_id', 'job_post_id'], 'matches_resume_job_unique');
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropUnique('matches_resume_job_unique');
        });
    }
};
