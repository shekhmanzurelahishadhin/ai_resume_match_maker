<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resume_versions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('generated_resume_id');
            $table->unsignedInteger('version_number');
            $table->json('content_json');
            $table->timestamps();

            $table->foreign('generated_resume_id')->references('id')->on('generated_resumes')->onDelete('cascade');
            $table->index('generated_resume_id');
            $table->index('version_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resume_versions');
    }
};
