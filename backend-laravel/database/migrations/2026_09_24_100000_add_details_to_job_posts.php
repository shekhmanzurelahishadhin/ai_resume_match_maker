<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The listing details a seeker needs before applying. All optional so existing
 * posts stay valid.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_posts', function (Blueprint $table) {
            $table->string('company', 160)->nullable()->after('title');
            $table->string('location', 160)->nullable()->after('company');
            $table->string('employment_type', 20)->nullable()->after('location'); // full_time | part_time | contract | internship
            $table->string('work_mode', 20)->nullable()->after('employment_type'); // onsite | remote | hybrid
            $table->string('experience_level', 20)->nullable()->after('work_mode'); // entry | mid | senior | lead
            $table->string('salary_range', 80)->nullable()->after('experience_level');
        });
    }

    public function down(): void
    {
        Schema::table('job_posts', function (Blueprint $table) {
            $table->dropColumn(['company', 'location', 'employment_type', 'work_mode', 'experience_level', 'salary_range']);
        });
    }
};
