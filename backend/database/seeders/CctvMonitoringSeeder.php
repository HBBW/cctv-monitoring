<?php

namespace Database\Seeders;

use App\Models\Cctv;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CctvMonitoringSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['name' => 'Admin CCTV', 'email' => 'admin@cctv.local', 'role' => User::ROLE_ADMIN],
            ['name' => 'Petugas CCTV', 'email' => 'petugas@cctv.local', 'role' => User::ROLE_PETUGAS],
            ['name' => 'Viewer CCTV', 'email' => 'viewer@cctv.local', 'role' => User::ROLE_VIEWER],
        ];

        foreach ($users as $user) {
            User::query()->updateOrCreate(
                ['email' => $user['email']],
                [...$user, 'password' => Hash::make('password')]
            );
        }

        foreach ([
            ['name' => 'CCTV Lobby Utama', 'location_point' => 'Gedung A - Lobby'],
            ['name' => 'CCTV Parkir Barat', 'location_point' => 'Area Parkir Barat'],
            ['name' => 'CCTV Koridor Lantai 2', 'location_point' => 'Gedung B - Lantai 2'],
            ['name' => 'CCTV Gudang Server', 'location_point' => 'Ruang Server'],
        ] as $cctv) {
            Cctv::query()->firstOrCreate($cctv, ['is_active' => true]);
        }
    }
}
