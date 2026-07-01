<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CctvShiftCheck;
use Illuminate\Http\Request;

class CheckController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'date' => ['nullable', 'date'],
        ]);

        $query = CctvShiftCheck::query()
            ->with('checker:id,name,email,role')
            ->latest('check_date')
            ->orderBy('hour_block');

        $query->when($data['date'] ?? null, fn ($q, $date) => $q->whereDate('check_date', $date));

        return response()->json($query->paginate(50));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'check_date' => ['required', 'date'],
            'hour_block' => ['required_without:hour_blocks', 'integer', 'between:0,23'],
            'hour_blocks' => ['required_without:hour_block', 'array', 'min:1'],
            'hour_blocks.*' => ['integer', 'between:0,23'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'evidence' => ['required', 'file', 'mimes:jpeg,jpg,png', 'max:2048'],
        ]);

        $hours = collect($data['hour_blocks'] ?? [$data['hour_block']])->unique()->sort()->values();
        $evidencePath = $request->file('evidence')->store('cctv-shift-checks', 'public');
        $checks = collect();

        foreach ($hours as $hour) {
            $checks->push(CctvShiftCheck::query()->updateOrCreate(
                [
                    'check_date' => $data['check_date'],
                    'hour_block' => $hour,
                ],
                [
                    'check_date' => $data['check_date'],
                    'hour_block' => $hour,
                    'notes' => $data['notes'] ?? null,
                    'evidence_path' => $evidencePath,
                    'checked_by' => $request->user()->id,
                ]
            ));
        }

        return response()->json([
            'message' => 'Pengecekan shift berhasil disimpan.',
            'checks' => $checks->map(fn (CctvShiftCheck $check) => $check->load('checker:id,name,email,role'))->values(),
        ], 201);
    }

    public function show(CctvShiftCheck $check)
    {
        return response()->json($check->load('checker:id,name,email,role'));
    }
}
