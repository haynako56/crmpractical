<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enquiries', function (Blueprint $table) {
            $table->id();
            $table->date('date')->nullable();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('source')->nullable();
            $table->string('lead')->nullable();
            $table->string('type')->nullable();
            $table->string('loc')->nullable();           // "2179 - Austral" format
            $table->string('rep')->nullable();           // assigned sales rep name
            $table->string('status')->default('New');
            $table->string('dep1')->default('NO');       // 1st deposit: YES / NO
            $table->string('dep2')->default('NO');       // 2nd deposit: YES / NO
            $table->text('notes')->nullable();
            $table->text('fu')->nullable();              // follow-up notes (newline-separated)
            $table->timestamp('first_contact_timestamp')->nullable();
            $table->json('files')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enquiries');
    }
};
