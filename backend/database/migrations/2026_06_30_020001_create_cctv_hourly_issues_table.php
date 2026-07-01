<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cctv_hourly_issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cctv_id')->constrained()->cascadeOnDelete();
            $table->date('issue_date')->index();
            $table->unsignedTinyInteger('hour_block');
            $table->enum('issue_type', [
                'camera_offline',
                'blur',
                'position_shifted',
                'storage_full',
                'network_issue',
                'other',
            ])->index();
            $table->text('description');
            $table->string('evidence_path')->nullable();
            $table->boolean('is_resolved')->default(false)->index();
            $table->text('resolution_note')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->unique(['cctv_id', 'issue_date', 'hour_block'], 'unique_cctv_hourly_issue');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cctv_hourly_issues');
    }
};
