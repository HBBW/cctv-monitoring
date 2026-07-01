<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'location_point',
    'is_active',
    'notes',
])]
class Cctv extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function issues(): HasMany
    {
        return $this->hasMany(CctvHourlyIssue::class);
    }

    public function checks(): HasMany
    {
        return $this->hasMany(CctvHourlyCheck::class);
    }
}
