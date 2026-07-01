<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cctv;
use App\Models\CctvHourlyCheck;
use App\Models\CctvHourlyIssue;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class IssueController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'date' => ['nullable', 'date'],
            'cctv_id' => ['nullable', 'integer', 'exists:cctvs,id'],
            'status' => ['nullable', Rule::in(['open', 'resolved'])],
            'issue_type' => ['nullable', Rule::in(CctvHourlyIssue::TYPES)],
        ]);

        $query = CctvHourlyIssue::query()
            ->with(['cctv', 'creator:id,name,email,role', 'resolver:id,name,email,role'])
            ->latest('issue_date')
            ->orderBy('hour_block');

        $query->when($data['date'] ?? null, fn ($q, $date) => $q->whereDate('issue_date', $date));
        $query->when($data['cctv_id'] ?? null, fn ($q, $id) => $q->where('cctv_id', $id));
        $query->when($data['issue_type'] ?? null, fn ($q, $type) => $q->where('issue_type', $type));

        if (($data['status'] ?? null) === 'open') {
            $query->where('is_resolved', false);
        } elseif (($data['status'] ?? null) === 'resolved') {
            $query->where('is_resolved', true);
        }

        return response()->json($query->paginate(50));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'cctv_id' => ['required', 'integer', 'exists:cctvs,id'],
            'issue_date' => ['required', 'date'],
            'hour_block' => ['required', 'integer', 'between:0,23'],
            'issue_type' => ['required', Rule::in(CctvHourlyIssue::TYPES)],
            'description' => ['required', 'string', 'max:5000'],
            'evidence' => ['required', 'file', 'mimes:jpeg,jpg,png', 'max:2048'],
        ]);

        $cctv = Cctv::query()->findOrFail($data['cctv_id']);
        if (! $cctv->is_active) {
            throw ValidationException::withMessages([
                'cctv_id' => ['CCTV tidak aktif tidak bisa menerima log masalah baru.'],
            ]);
        }

        $exists = CctvHourlyIssue::query()
            ->where('cctv_id', $data['cctv_id'])
            ->whereDate('issue_date', $data['issue_date'])
            ->where('hour_block', $data['hour_block'])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'hour_block' => ['Sudah ada log masalah untuk CCTV dan jam ini.'],
            ]);
        }

        $data['evidence_path'] = $request->file('evidence')->store('cctv-evidence', 'public');

        unset($data['evidence']);
        $data['created_by'] = $request->user()->id;

        CctvHourlyCheck::query()
            ->where('cctv_id', $data['cctv_id'])
            ->whereDate('check_date', $data['issue_date'])
            ->where('hour_block', $data['hour_block'])
            ->delete();

        $issue = CctvHourlyIssue::query()->create($data);

        return response()->json($issue->load(['cctv', 'creator:id,name,email,role']), 201);
    }

    public function show(CctvHourlyIssue $issue)
    {
        return response()->json($issue->load(['cctv', 'creator:id,name,email,role', 'resolver:id,name,email,role']));
    }

    public function resolve(Request $request, CctvHourlyIssue $issue)
    {
        $data = $request->validate([
            'resolution_note' => ['nullable', 'string', 'max:5000'],
        ]);

        $issue->update([
            'is_resolved' => true,
            'resolution_note' => $data['resolution_note'] ?? null,
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);

        return response()->json($issue->fresh()->load(['cctv', 'creator:id,name,email,role', 'resolver:id,name,email,role']));
    }
}
