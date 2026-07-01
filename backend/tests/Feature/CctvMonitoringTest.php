<?php

namespace Tests\Feature;

use App\Models\Cctv;
use App\Models\CctvHourlyIssue;
use App\Models\CctvShiftCheck;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CctvMonitoringTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_cctv_master_data(): void
    {
        Sanctum::actingAs($this->user(User::ROLE_ADMIN));

        $this->postJson('/api/cctvs', [
            'name' => 'CCTV Lobby',
            'location_point' => 'Lobby Utama',
            'is_active' => true,
        ])->assertCreated()->assertJsonPath('name', 'CCTV Lobby');

        $cctv = Cctv::query()->first();

        $this->deleteJson("/api/cctvs/{$cctv->id}")
            ->assertOk()
            ->assertJsonPath('message', 'CCTV dinonaktifkan.');

        $this->assertFalse($cctv->fresh()->is_active);
    }

    public function test_petugas_can_create_issue_with_evidence_and_daily_matrix_marks_exception_only(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->user(User::ROLE_PETUGAS));
        $cctv = Cctv::query()->create(['name' => 'CCTV Parkir', 'location_point' => 'Parkir Barat']);

        $this->postJson('/api/issues', [
            'cctv_id' => $cctv->id,
            'issue_date' => '2026-06-30',
            'hour_block' => 8,
            'issue_type' => 'camera_offline',
            'description' => 'Kamera mati saat pengecekan pagi.',
            'evidence' => UploadedFile::fake()->image('bukti.jpg')->size(512),
        ])->assertCreated()->assertJsonPath('hour_block', 8);

        $issue = CctvHourlyIssue::query()->first();
        Storage::disk('public')->assertExists($issue->evidence_path);

        $this->getJson('/api/reports/daily?date=2026-06-30')
            ->assertOk()
            ->assertJsonPath('rows.0.hours.7.status', 'unchecked')
            ->assertJsonPath('rows.0.hours.8.status', 'issue');
    }

    public function test_petugas_can_store_normal_check_with_required_evidence(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->user(User::ROLE_PETUGAS));
        Cctv::query()->create(['name' => 'CCTV Normal 1', 'location_point' => 'Lobby']);
        Cctv::query()->create(['name' => 'CCTV Normal 2', 'location_point' => 'Parkir']);

        $this->postJson('/api/checks', [
            'check_date' => '2026-06-30',
            'hour_blocks' => [7, 8],
            'notes' => 'Kondisi aman.',
            'evidence' => UploadedFile::fake()->image('normal.jpg')->size(400),
        ])->assertCreated()->assertJsonPath('checks.0.hour_block', 7);

        $check = CctvShiftCheck::query()->first();
        Storage::disk('public')->assertExists($check->evidence_path);
        $this->assertSame(2, CctvShiftCheck::query()->count());

        $this->getJson('/api/reports/daily?date=2026-06-30')
            ->assertOk()
            ->assertJsonPath('rows.0.hours.7.status', 'checked')
            ->assertJsonPath('rows.1.hours.7.status', 'checked')
            ->assertJsonPath('checks.0.hour_block', 7)
            ->assertJsonPath('rows.0.hours.8.status', 'checked');
    }

    public function test_viewer_cannot_create_or_resolve_issues(): void
    {
        Sanctum::actingAs($this->user(User::ROLE_VIEWER));
        $cctv = Cctv::query()->create(['name' => 'CCTV Gudang', 'location_point' => 'Gudang']);
        $issue = CctvHourlyIssue::query()->create([
            'cctv_id' => $cctv->id,
            'issue_date' => '2026-06-30',
            'hour_block' => 10,
            'issue_type' => 'blur',
            'description' => 'Blur',
            'created_by' => $this->user(User::ROLE_PETUGAS)->id,
        ]);

        $this->postJson('/api/issues', [
            'cctv_id' => $cctv->id,
            'issue_date' => '2026-06-30',
            'hour_block' => 11,
            'issue_type' => 'blur',
            'description' => 'Blur',
        ])->assertForbidden();

        $this->patchJson("/api/issues/{$issue->id}/resolve", ['resolution_note' => 'Selesai'])
            ->assertForbidden();
    }

    public function test_inactive_cctv_rejects_new_issue_and_report_exports_are_authorized(): void
    {
        Sanctum::actingAs($this->user(User::ROLE_PETUGAS));
        $cctv = Cctv::query()->create([
            'name' => 'CCTV Nonaktif',
            'location_point' => 'Arsip',
            'is_active' => false,
        ]);

        $this->postJson('/api/issues', [
            'cctv_id' => $cctv->id,
            'issue_date' => '2026-06-30',
            'hour_block' => 9,
            'issue_type' => 'network_issue',
            'description' => 'Tidak tersambung.',
        ])->assertUnprocessable();

        $this->getJson('/api/reports/daily.csv?date=2026-06-30')->assertOk();
        $this->get('/api/reports/daily.pdf?date=2026-06-30')->assertOk();
    }

    public function test_monthly_report_summarizes_issue_days_and_exports(): void
    {
        Sanctum::actingAs($this->user(User::ROLE_ADMIN));
        $cctv = Cctv::query()->create(['name' => 'CCTV Bulanan', 'location_point' => 'Lobby']);
        CctvHourlyIssue::query()->create([
            'cctv_id' => $cctv->id,
            'issue_date' => '2026-06-15',
            'hour_block' => 14,
            'issue_type' => 'storage_full',
            'description' => 'Storage penuh.',
            'created_by' => $this->user(User::ROLE_PETUGAS)->id,
        ]);

        $this->getJson('/api/reports/monthly?month=2026-06')
            ->assertOk()
            ->assertJsonPath('month', '2026-06')
            ->assertJsonPath('days_in_month', 30)
            ->assertJsonPath('rows.0.days.14.status', 'issue')
            ->assertJsonPath('rows.0.days.14.issue_count', 1)
            ->assertJsonPath('issue_details.0.date', '2026-06-15')
            ->assertJsonPath('issue_details.0.hour_label', '14:00')
            ->assertJsonPath('issue_details.0.issue_label', 'Storage penuh')
            ->assertJsonPath('issue_summary.0.issue_label', 'Storage penuh')
            ->assertJsonPath('issue_summary.0.total', 1)
            ->assertJsonPath('issue_summary.0.open', 1)
            ->assertJsonPath('issue_summary.0.days_count', 1);

        $this->getJson('/api/reports/monthly.csv?month=2026-06')->assertOk();
        $this->get('/api/reports/monthly.pdf?month=2026-06')->assertOk();
    }

    private function user(string $role): User
    {
        return User::query()->firstOrCreate(
            ['email' => "{$role}@example.com"],
            ['name' => ucfirst($role), 'password' => 'password', 'role' => $role]
        );
    }
}
