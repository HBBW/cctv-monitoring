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

## Menjalankan Dengan Docker

Jalankan dari folder root project:

```bash
docker compose up --build
```

Service yang tersedia:

- Dashboard HTTPS via Nginx Proxy Manager: `https://cctv.bmc.co.id`
- Dashboard React: `http://localhost:3010`
- API Laravel: `http://localhost:8010/api`
- phpMyAdmin: `http://localhost:8586`
- MySQL: `localhost:3310`

Konfigurasi default Docker:

```env
APP_URL=https://api-cctv.bmc.co.id
FRONTEND_URL=https://cctv.bmc.co.id
DB_HOST=mysql
DB_DATABASE=cctv_exception_monitoring
DB_USERNAME=cctv
DB_PASSWORD=cctv
DB_ROOT_PASSWORD=root
FRONTEND_PORT=3010
BACKEND_PORT=8010
MYSQL_PORT=3310
PHPMYADMIN_PORT=8586
VITE_API_URL=https://api-cctv.bmc.co.id/api
```

Container backend otomatis menjalankan:

- `composer install` jika `vendor/` belum ada
- copy `.env.example` ke `.env` jika belum ada
- `php artisan key:generate`
- `php artisan storage:link`
- `php artisan migrate --seed`

Untuk reset database Docker:

```bash
docker compose down -v
docker compose up --build
```

## Deploy Lewat Portainer

1. Buat repository GitHub berisi project ini.
2. Di Portainer buka `Stacks`, pilih `Add stack`.
3. Pilih sumber `Repository`, isi URL repo:

```text
https://github.com/HBBW/cctv-monitoring.git
```

4. Compose path isi:

```text
docker-compose.yml
```

5. Kalau server bukan laptop lokal, isi environment stack sesuai contoh `.env.portainer.example`.
   Minimal sesuaikan:

```env
APP_URL=https://api-cctv.bmc.co.id
FRONTEND_URL=https://cctv.bmc.co.id
VITE_API_URL=https://api-cctv.bmc.co.id/api
```

6. Klik `Deploy the stack`.

Setelah deploy:

- Dashboard HTTPS: `https://cctv.bmc.co.id`
- API HTTPS: `https://api-cctv.bmc.co.id/api`
- Dashboard HTTP langsung: `http://IP_SERVER:3010`
- API langsung: `http://IP_SERVER:8010/api`
- phpMyAdmin: `http://IP_SERVER:8586`

Data MySQL disimpan di volume `mysql_data`, dan bukti foto disimpan di volume `backend_public_storage`.

Untuk HTTPS host, gunakan Nginx Proxy Manager di server `10.19.25.29`:

- `cctv.bmc.co.id` -> `10.19.25.29:3010`
- `api-cctv.bmc.co.id` -> `10.19.25.29:8010`

Pilih wildcard certificate pada masing-masing proxy host, lalu aktifkan `Force SSL` dan `HTTP/2 Support`.

## Fitur Utama

- Matrix harian 24 jam: CCTV x jam.
- Kondisi normal tidak disimpan ke database.
- Issue disimpan hanya saat ada masalah, dengan tipe masalah, deskripsi, dan bukti visual.
- Role: Admin, Petugas, Viewer.
- Resolve issue dengan catatan perbaikan.
- Export laporan harian CSV dan PDF.
