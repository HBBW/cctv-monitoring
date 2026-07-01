<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'check_date',
    'hour_block',
    'evidence_path',
    'notes',
    'checked_by',
])]
class CctvShiftCheck extends Model
{
    use HasFactory;

    protected $appends = ['evidence_url'];

    protected function casts(): array
    {
        return [
            'check_date' => 'date:Y-m-d',
            'hour_block' => 'integer',
        ];
    }

    public function checker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_by');
    }

    public function getEvidenceUrlAttribute(): ?string
    {
        return $this->evidence_path ? Storage::disk('public')->url($this->evidence_path) : null;
    }
}
