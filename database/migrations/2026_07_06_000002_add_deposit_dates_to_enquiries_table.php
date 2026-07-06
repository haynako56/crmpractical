<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->date('dep1_date')->nullable()->after('dep1');
            $table->date('dep2_date')->nullable()->after('dep2');
        });
    }

    public function down(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->dropColumn(['dep1_date', 'dep2_date']);
        });
    }
};
