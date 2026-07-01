<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'cctv_id',
    'issue_date',
    'hour_block',
    'issue_type',
    'description',
    'evidence_path',
    'is_resolved',
    'resolution_note',
    'created_by',
    'resolved_by',
    'resolved_at',
])]
class CctvHourlyIssue extends Model
{
    use HasFactory;

    public const TYPES = [
        'camera_offline',
        'blur',
        'position_shifted',
        'storage_full',
        'network_issue',
        'other',
    ];

    protected $appends = ['evidence_url'];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date:Y-m-d',
            'hour_block' => 'integer',
            'is_resolved' => 'boolean',
            'resolved_at' => 'datetime',
        ];
    }

    public function cctv(): BelongsTo
    {
        return $this->belongsTo(Cctv::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function getEvidenceUrlAttribute(): ?string
    {
        return $this->evidence_path ? Storage::disk('public')->url($this->evidence_path) : null;
    }
}
