<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rate_limit_buckets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key')->unique(); // e.g. 'resume_upload:user:<id>'
            $table->unsignedInteger('count')->default(0);
            // Explicit default: without one MySQL adds ON UPDATE CURRENT_TIMESTAMP
            // to the first timestamp column and rewrites it on every update.
            $table->timestamp('window_end')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rate_limit_buckets');
    }
};
