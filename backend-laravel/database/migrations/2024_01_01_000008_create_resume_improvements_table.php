<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resume_improvements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('resume_id');
            $table->longText('original_text');
            $table->longText('improved_text');
            $table->string('suggestion_type'); // 'grammar' | 'style' | 'enhancement'
            $table->string('source'); // 'ai' | 'fallback'
            $table->timestamps();

            $table->foreign('resume_id')->references('id')->on('resumes')->onDelete('cascade');
            $table->index('resume_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resume_improvements');
    }
};
