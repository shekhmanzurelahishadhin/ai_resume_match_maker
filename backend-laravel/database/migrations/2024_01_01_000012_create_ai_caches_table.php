<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_caches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('cache_key', 64)->unique(); // md5(resumeText + jobText)
            $table->json('result');
            $table->string('source'); // 'ai' | 'fallback'
            // Explicit default — see the note in the rate_limit_buckets migration.
            $table->timestamp('expires_at')->useCurrent();
            $table->timestamps();

            $table->index('cache_key');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_caches');
    }
};
