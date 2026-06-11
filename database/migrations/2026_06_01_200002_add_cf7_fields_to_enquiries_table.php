<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->string('cf7_status')->nullable()->after('contactform7_id');      // unread / read
            $table->string('interested')->nullable()->after('type');                  // e.g. "Single Storey Homes"
            $table->string('where_did_you_hear')->nullable()->after('source');       // Wheredidyouhear column
            $table->string('design_name')->nullable()->after('notes');               // DesignName column
            $table->string('alt_s')->nullable()->after('design_name');               // "Alt S" column
            $table->string('ajxizl7033')->nullable()->after('alt_s');               // last CF7 column
        });
    }

    public function down(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->dropColumn(['cf7_status', 'interested', 'where_did_you_hear', 'design_name', 'alt_s', 'ajxizl7033']);
        });
    }
};
