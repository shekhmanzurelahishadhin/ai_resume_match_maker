<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('resume_id');
            $table->uuid('job_post_id');
            $table->uuid('recruiter_id');
            $table->float('match_percentage')->default(0);
            $table->string('match_source')->default('fallback'); // 'ai' | 'fallback'
            $table->json('matched_skills_json')->nullable(); // { skills: string[] }
            $table->json('missing_skills_json')->nullable(); // { skills: string[] }
            $table->timestamp('analyzed_at')->useCurrent();
            $table->timestamps();

            $table->foreign('resume_id')->references('id')->on('resumes')->onDelete('cascade');
            $table->foreign('job_post_id')->references('id')->on('job_posts')->onDelete('cascade');
            $table->foreign('recruiter_id')->references('id')->on('users')->onDelete('cascade');

            $table->index('resume_id');
            $table->index('job_post_id');
            $table->index('recruiter_id');
            $table->index('match_percentage');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
