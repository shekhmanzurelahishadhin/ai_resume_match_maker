<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_applications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('job_post_id');
            $table->uuid('seeker_id');
            // The resume the seeker chose to send: an upload or a builder resume.
            $table->uuid('resume_id')->nullable();
            $table->uuid('generated_resume_id')->nullable();
            $table->text('cover_letter')->nullable();
            $table->string('status', 20)->default('applied');
            // Snapshot of the match score at the time of applying.
            $table->float('match_percentage')->nullable();
            $table->timestamp('status_changed_at')->nullable();
            $table->timestamps();

            $table->foreign('job_post_id')->references('id')->on('job_posts')->onDelete('cascade');
            $table->foreign('seeker_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('resume_id')->references('id')->on('resumes')->nullOnDelete();
            $table->foreign('generated_resume_id')->references('id')->on('generated_resumes')->nullOnDelete();
            $table->unique(['job_post_id', 'seeker_id']);
            $table->index(['seeker_id', 'created_at']);
            $table->index(['job_post_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_applications');
    }
};
