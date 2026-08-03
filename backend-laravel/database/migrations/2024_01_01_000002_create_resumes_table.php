<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resumes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('file_name');
            $table->string('file_path'); // S3 key / local path
            $table->string('mime_type');
            $table->unsignedInteger('file_size_bytes');
            $table->longText('extracted_text')->nullable();
            $table->json('skills_json')->nullable(); // { skills: string[], categories: Record<string,string[]> }
            $table->float('experience_years')->nullable();
            $table->string('status')->default('pending'); // 'pending' | 'parsing' | 'ready' | 'failed'
            $table->string('parse_error')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('user_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resumes');
    }
};
