<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->string('contactform7_id')->nullable()->unique()->after('id');
            $table->string('postcode')->nullable()->after('loc');
            $table->text('message')->nullable()->after('notes');
            $table->boolean('join_email_list')->default(false)->after('message');
        });
    }

    public function down(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->dropUnique(['contactform7_id']);
            $table->dropColumn(['contactform7_id', 'postcode', 'message', 'join_email_list']);
        });
    }
};
