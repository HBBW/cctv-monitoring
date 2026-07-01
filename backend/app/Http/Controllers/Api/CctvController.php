<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cctv;
use Illuminate\Http\Request;

class CctvController extends Controller
{
    public function index(Request $request)
    {
        $query = Cctv::query()->orderBy('name');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'location_point' => ['required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        return response()->json(Cctv::query()->create($data), 201);
    }

    public function show(Cctv $cctv)
    {
        return response()->json($cctv);
    }

    public function update(Request $request, Cctv $cctv)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'location_point' => ['sometimes', 'required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        $cctv->update($data);

        return response()->json($cctv->fresh());
    }

    public function destroy(Cctv $cctv)
    {
        $cctv->update(['is_active' => false]);

        return response()->json(['message' => 'CCTV dinonaktifkan.']);
    }
}
