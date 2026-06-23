<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('enquiries')->where('status', 'Closed')->update(['status' => 'Cold']);
    }

    public function down(): void
    {
        DB::table('enquiries')->where('status', 'Cold')->update(['status' => 'Closed']);
    }
};
