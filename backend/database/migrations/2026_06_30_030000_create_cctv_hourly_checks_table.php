<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cctv_hourly_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cctv_id')->constrained()->cascadeOnDelete();
            $table->date('check_date')->index();
            $table->unsignedTinyInteger('hour_block');
            $table->string('evidence_path');
            $table->text('notes')->nullable();
            $table->foreignId('checked_by')->constrained('users');
            $table->timestamps();

            $table->unique(['cctv_id', 'check_date', 'hour_block'], 'unique_cctv_hourly_check');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cctv_hourly_checks');
    }
};
