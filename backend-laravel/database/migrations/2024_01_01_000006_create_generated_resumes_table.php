<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('generated_resumes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('original_resume_id')->nullable();
            $table->uuid('template_id');
            $table->json('content_json'); // structured resume content
            $table->json('customization_json')->nullable(); // colors, fonts, spacing
            $table->string('file_path_pdf')->nullable();
            $table->string('file_path_docx')->nullable();
            $table->string('file_path_html')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->boolean('is_current')->default(true);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('original_resume_id')->references('id')->on('resumes')->onDelete('set null');
            $table->foreign('template_id')->references('id')->on('resume_templates');

            $table->index('user_id');
            $table->index('template_id');
            $table->index('is_current');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('generated_resumes');
    }
};
