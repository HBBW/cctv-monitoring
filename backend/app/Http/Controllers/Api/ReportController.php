<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cctv;
use App\Models\CctvHourlyIssue;
use App\Models\CctvShiftCheck;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function daily(Request $request)
    {
        $date = $request->validate(['date' => ['required', 'date']])['date'];

        return response()->json($this->matrix($date));
    }

    public function csv(Request $request): StreamedResponse
    {
        $date = $request->validate(['date' => ['required', 'date']])['date'];
        $matrix = $this->matrix($date);

        return response()->streamDownload(function () use ($matrix) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Tanggal', 'CCTV', 'Lokasi', 'Jam', 'Status', 'Tipe Masalah', 'Deskripsi']);

            foreach ($matrix['rows'] as $row) {
                foreach ($row['hours'] as $hour) {
                    fputcsv($handle, [
                        $matrix['date'],
                        $row['name'],
                        $row['location_point'],
                        $hour['hour'],
                        $hour['status'],
                        $hour['issue']['issue_type'] ?? ($hour['check'] ? 'OK' : ''),
                        $hour['issue']['description'] ?? ($hour['check']['notes'] ?? ''),
                    ]);
                }
            }

            fclose($handle);
        }, "laporan-cctv-{$date}.csv", ['Content-Type' => 'text/csv']);
    }

    public function pdf(Request $request)
    {
        $date = $request->validate(['date' => ['required', 'date']])['date'];
        $matrix = $this->matrix($date);

        return Pdf::loadView('reports.daily-cctv', ['matrix' => $matrix])
            ->setPaper('a4', 'landscape')
            ->download("laporan-cctv-{$date}.pdf");
    }

    public function monthly(Request $request)
    {
        $month = $request->validate(['month' => ['required', 'date_format:Y-m']])['month'];

        return response()->json($this->monthlyMatrix($month));
    }

    public function monthlyCsv(Request $request): StreamedResponse
    {
        $month = $request->validate(['month' => ['required', 'date_format:Y-m']])['month'];
        $matrix = $this->monthlyMatrix($month);

        return response()->streamDownload(function () use ($matrix) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Bulan', 'Tipe Masalah', 'Total Issue', 'Terbuka', 'Selesai', 'Hari Terdampak', 'CCTV Terdampak']);

            foreach ($matrix['issue_summary'] as $summary) {
                fputcsv($handle, [
                    $matrix['month'],
                    $summary['issue_label'],
                    $summary['total'],
                    $summary['open'],
                    $summary['resolved'],
                    $summary['days_count'],
                    $summary['cctv_names'],
                ]);
            }

            fclose($handle);
        }, "laporan-cctv-bulanan-{$month}.csv", ['Content-Type' => 'text/csv']);
    }

    public function monthlyPdf(Request $request)
    {
        $month = $request->validate(['month' => ['required', 'date_format:Y-m']])['month'];
        $matrix = $this->monthlyMatrix($month);

        return Pdf::loadView('reports.monthly-cctv', ['matrix' => $matrix])
            ->setPaper('a4', 'landscape')
            ->download("laporan-cctv-bulanan-{$month}.pdf");
    }

    private function matrix(string $date): array
    {
        $issues = CctvHourlyIssue::query()
            ->with(['creator:id,name,email,role', 'resolver:id,name,email,role'])
            ->whereDate('issue_date', $date)
            ->get()
            ->groupBy('cctv_id');

        $checksByHour = CctvShiftCheck::query()
            ->with('checker:id,name,email,role')
            ->whereDate('check_date', $date)
            ->get()
            ->keyBy('hour_block');

        $rows = Cctv::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Cctv $cctv) use ($issues, $checksByHour) {
                $issuesByHour = $issues->get($cctv->id, collect())->keyBy('hour_block');

                $hours = collect(range(0, 23))->map(function (int $hour) use ($issuesByHour, $checksByHour) {
                    $issue = $issuesByHour->get($hour);
                    $check = $checksByHour->get($hour);
                    $status = 'unchecked';

                    if ($issue) {
                        $status = $issue->is_resolved ? 'resolved' : 'issue';
                    } elseif ($check) {
                        $status = 'checked';
                    }

                    return [
                        'hour' => $hour,
                        'status' => $status,
                        'issue' => $issue,
                        'check' => $check,
                        'issue_label' => $issue ? $this->issueLabel($issue->issue_type) : null,
                    ];
                });

                return [
                    'id' => $cctv->id,
                    'name' => $cctv->name,
                    'location_point' => $cctv->location_point,
                    'hours' => $hours->all(),
                ];
            });

        return [
            'date' => $date,
            'issue_types' => CctvHourlyIssue::TYPES,
            'issue_labels' => $this->issueLabels(),
            'checks' => $checksByHour->values(),
            'rows' => $rows,
        ];
    }

    private function monthlyMatrix(string $month): array
    {
        $start = Carbon::createFromFormat('Y-m-d', "{$month}-01")->startOfDay();
        $end = $start->copy()->endOfMonth();

        $issues = CctvHourlyIssue::query()
            ->with('cctv:id,name,location_point')
            ->whereBetween('issue_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('issue_date')
            ->orderBy('hour_block')
            ->get();
        $checks = CctvShiftCheck::query()
            ->whereBetween('check_date', [$start->toDateString(), $end->toDateString()])
            ->get();

        $groupedIssues = $issues
            ->groupBy(fn (CctvHourlyIssue $issue) => "{$issue->cctv_id}|{$issue->issue_date->format('Y-m-d')}");
        $groupedChecks = $checks
            ->groupBy(fn (CctvShiftCheck $check) => $check->check_date->format('Y-m-d'));

        $rows = Cctv::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Cctv $cctv) use ($groupedIssues, $groupedChecks, $start, $end) {
                return [
                    'id' => $cctv->id,
                    'name' => $cctv->name,
                    'location_point' => $cctv->location_point,
                    'days' => collect(range(1, $end->day))->map(function (int $day) use ($cctv, $groupedIssues, $groupedChecks, $start) {
                        $date = $start->copy()->day($day)->toDateString();
                        $dailyIssues = $groupedIssues->get("{$cctv->id}|{$date}", collect());
                        $dailyChecks = $groupedChecks->get($date, collect());
                        $openCount = $dailyIssues->where('is_resolved', false)->count();
                        $resolvedCount = $dailyIssues->where('is_resolved', true)->count();
                        $issueItems = $dailyIssues
                            ->sortBy('hour_block')
                            ->map(fn (CctvHourlyIssue $issue) => [
                                'hour' => $issue->hour_block,
                                'issue_type' => $issue->issue_type,
                                'issue_label' => $this->issueLabel($issue->issue_type),
                                'description' => $issue->description,
                                'is_resolved' => $issue->is_resolved,
                            ])
                            ->values();

                        return [
                            'day' => $day,
                            'date' => $date,
                            'status' => $openCount > 0 ? 'issue' : ($dailyIssues->count() > 0 ? 'resolved' : ($dailyChecks->count() > 0 ? 'checked' : 'unchecked')),
                            'issue_count' => $dailyIssues->count(),
                            'open_count' => $openCount,
                            'resolved_count' => $resolvedCount,
                            'checked_count' => $dailyChecks->count(),
                            'unchecked_count' => 24 - $dailyChecks->count() - $dailyIssues->count(),
                            'issues' => $issueItems,
                            'issue_summary' => $issueItems->pluck('issue_label')->unique()->join(', '),
                        ];
                    })->all(),
                ];
            });

        $issueSummary = $issues
            ->groupBy('issue_type')
            ->map(fn ($items, string $type) => [
                'issue_type' => $type,
                'issue_label' => $this->issueLabel($type),
                'total' => $items->count(),
                'open' => $items->where('is_resolved', false)->count(),
                'resolved' => $items->where('is_resolved', true)->count(),
                'days_count' => $items->pluck('issue_date')->map(fn ($date) => $date->format('Y-m-d'))->unique()->count(),
                'cctv_count' => $items->pluck('cctv_id')->unique()->count(),
                'cctv_names' => $items->pluck('cctv.name')->filter()->unique()->values()->join(', '),
            ])
            ->sortByDesc('total')
            ->values();

        return [
            'month' => $month,
            'days_in_month' => $end->day,
            'issue_labels' => $this->issueLabels(),
            'shift_check_count' => $checks->count(),
            'rows' => $rows,
            'issue_summary' => $issueSummary,
            'issue_details' => $issues->map(fn (CctvHourlyIssue $issue) => [
                'id' => $issue->id,
                'date' => $issue->issue_date->format('Y-m-d'),
                'day' => (int) $issue->issue_date->format('j'),
                'hour' => $issue->hour_block,
                'hour_label' => sprintf('%02d:00', $issue->hour_block),
                'cctv_name' => $issue->cctv?->name,
                'location_point' => $issue->cctv?->location_point,
                'issue_type' => $issue->issue_type,
                'issue_label' => $this->issueLabel($issue->issue_type),
                'description' => $issue->description,
                'is_resolved' => $issue->is_resolved,
            ])->values(),
        ];
    }

    private function issueLabels(): array
    {
        return [
            'camera_offline' => 'Kamera mati',
            'blur' => 'Gambar blur',
            'position_shifted' => 'Posisi bergeser',
            'storage_full' => 'Storage penuh',
            'network_issue' => 'Gangguan jaringan',
            'other' => 'Lainnya',
        ];
    }

    private function issueLabel(string $type): string
    {
        return $this->issueLabels()[$type] ?? $type;
    }
}
