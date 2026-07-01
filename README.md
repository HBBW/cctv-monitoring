# CCTV Exception-Based Monitoring System

Aplikasi monitoring CCTV berbasis exception reporting dengan Laravel 13 API, React dashboard, MySQL, upload bukti visual, role-based access, dan export CSV/PDF.

## Struktur

- `backend/` - Laravel 13 REST API.
- `frontend/` - React dashboard.

## Akun Awal

Jalankan seeder untuk membuat akun demo berikut. Semua password: `password`.

- `admin@cctv.local` - Admin
- `petugas@cctv.local` - Petugas
- `viewer@cctv.local` - Viewer

## Menjalankan Backend

```bash
cd backend
copy .env.example .env
php artisan key:generate
php artisan storage:link
php artisan migrate --seed
php artisan serve
```

Sesuaikan konfigurasi MySQL di `backend/.env`:

```env
DB_DATABASE=cctv_exception_monitoring
DB_USERNAME=root
DB_PASSWORD=
```

## Menjalankan Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Dashboard berjalan di `http://localhost:5173` dan API di `http://localhost:8000/api`.

## Fitur Utama

- Matrix harian 24 jam: CCTV x jam.
- Kondisi normal tidak disimpan ke database.
- Issue disimpan hanya saat ada masalah, dengan tipe masalah, deskripsi, dan bukti visual.
- Role: Admin, Petugas, Viewer.
- Resolve issue dengan catatan perbaikan.
- Export laporan harian CSV dan PDF.
