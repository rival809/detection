# Vehicle License Plate Detection & Tax Checker System

## Stack Teknologi

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui |
| API Gateway | FastAPI (Python 3.11) |
| Task Queue | Celery 5 + Redis 7 |
| Object Storage | MinIO (self-hosted, S3-compatible) |
| Database | PostgreSQL 16 + SQLAlchemy (ORM) |
| AI - ALPR | fast-alpr (YOLOv9 detection + fast-plate-ocr) |
| Auth | JWT (python-jose) + bcrypt |
| Real-time | WebSocket (FastAPI native) |
| Container | Docker + Docker Compose |

---

## Struktur Direktori

```
detection/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py
│   │   │   │   ├── videos.py
│   │   │   │   ├── detections.py
│   │   │   │   └── ws.py
│   │   │   └── deps.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── celery_app.py
│   │   ├── db/
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   └── session.py
│   │   ├── services/
│   │   │   ├── storage.py
│   │   │   ├── video_processor.py
│   │   │   ├── alpr_engine.py        ← fast-alpr (detection + OCR sekaligus)
│   │   │   ├── tax_api.py
│   │   │   └── deduplicator.py
│   │   └── tasks/
│   │       └── process_video.py
│   ├── models/                        ← fast-alpr auto-download model ke sini
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── videos/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── upload/page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   ├── VideoUploader.tsx
│   │   ├── DetectionTable.tsx
│   │   ├── ProcessingStatus.tsx
│   │   └── TaxStatusBadge.tsx
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Skema Database

```sql
-- users
id UUID PK, email VARCHAR UNIQUE, hashed_password VARCHAR,
is_active BOOL, created_at TIMESTAMP

-- videos
id UUID PK, user_id UUID FK, original_filename VARCHAR,
storage_path VARCHAR, status ENUM(PENDING,PROCESSING,COMPLETED,FAILED),
error_message TEXT, total_plates INT, uploaded_at TIMESTAMP, processed_at TIMESTAMP

-- detections
id UUID PK, video_id UUID FK, plate_number VARCHAR,
confidence FLOAT, image_crop_url VARCHAR, tax_info_json JSONB,
tax_status ENUM(ACTIVE,EXPIRED,NOT_FOUND,ERROR),
detected_at TIMESTAMP
```

---

## Docker Compose Services

```yaml
services:
  postgres:    # Port 5432
  redis:       # Port 6379
  minio:       # Port 9000 (API) + 9001 (Console)
  backend:     # Port 8000 — FastAPI
  worker:      # Celery worker (image sama dengan backend)
  frontend:    # Port 3000 — Next.js
```

---

## Roadmap Implementasi

### Tahap 1 — Foundation & Auth (Minggu 1, Hari 1-2)

**Target:** Project bisa dijalankan, user bisa register/login, JWT berfungsi.

- [ ] Setup Docker Compose (postgres, redis, minio, backend, frontend)
- [ ] Inisialisasi FastAPI project + SQLAlchemy
- [ ] Buat model DB: users, videos, detections
- [ ] Alembic migration (schema awal)
- [ ] Endpoint `POST /auth/register` (bcrypt password)
- [ ] Endpoint `POST /auth/login` (return JWT access + refresh token)
- [ ] Dependency `get_current_user` untuk proteksi route
- [ ] Setup MinIO bucket + service layer `storage.py`
- [ ] Inisialisasi Next.js + Tailwind + shadcn/ui
- [ ] Halaman Login & Register (form + API call)
- [ ] JWT disimpan di httpOnly cookie

---

### Tahap 2 — Ingestion & Storage (Minggu 1, Hari 3-5)

**Target:** User bisa upload video, file tersimpan di MinIO, job masuk ke Celery.

- [ ] Endpoint `POST /videos/upload`
  - Validasi file (hanya `.mp4`, `.avi`, `.mov`, max 500MB)
  - Upload ke MinIO → path dicatat di DB
  - Insert record `videos` dengan `status=PENDING`
  - Trigger Celery task `process_video.delay(video_id)`
  - Return `{ video_id, job_id }`
- [ ] Endpoint `GET /videos` → list video milik user (pagination)
- [ ] Endpoint `GET /videos/{id}` → detail + status terkini
- [ ] Celery worker setup + Redis broker config
- [ ] Task `process_video` skeleton (hanya update status ke PROCESSING)
- [ ] Frontend: halaman upload dengan drag & drop (`react-dropzone`)
- [ ] Frontend: list video dengan status badge (PENDING / PROCESSING / COMPLETED / FAILED)

---

### Tahap 3 — Video Processing Pipeline (Minggu 2)

**Target:** Video diproses otomatis oleh worker, plat nomor terdeteksi.

#### Frame Sampling & Blur Detection (`video_processor.py`)

```
1. Download video dari MinIO ke /tmp
2. Buka dengan OpenCV
3. Loop setiap N frame (misal setiap 15 frame = 0.5 detik di 30fps)
4. Hitung Laplacian Variance → skip jika < threshold (frame blur)
5. Yield frame yang lolos untuk dideteksi
```

- [ ] Implementasi `frame_sampler(video_path, interval_sec=0.5)`
- [ ] Implementasi `is_sharp(frame, threshold=100.0)` → Laplacian Variance
- [ ] Download video dari MinIO sebelum proses, cleanup setelah selesai

#### ALPR Engine (`alpr_engine.py`) — fast-alpr

fast-alpr menggabungkan deteksi plat (YOLOv9) dan pembacaan teks (fast-plate-ocr) dalam satu langkah.

```
frame → fast-alpr → [{ plate_number, confidence, crop }, ...]
```

- [x] Inisialisasi lazy `FastALPR` (download model otomatis saat pertama run)
- [x] Fungsi `detect_and_read(frame)` → return list `{ plate_number, confidence, crop }`
- [x] Normalisasi teks (uppercase, hapus karakter non-alphanumeric)
- [x] Upload crop image ke MinIO → return URL
- [ ] Hapus `yolo_detector.py` dan `ocr_engine.py` (digantikan sepenuhnya)

#### Deduplication (`deduplicator.py`)

- [ ] Fungsi `deduplicate(detections)` → list deteksi unik per plat per video
- [ ] Threshold similarity untuk tangani OCR error minor (misal `B1234CD` vs `B1234C0`)

#### Progress Reporting via WebSocket

- [ ] Endpoint `WS /ws/videos/{id}/progress`
- [ ] Worker kirim update ke Redis channel setiap stage selesai
- [ ] WebSocket relay update ke frontend
- [ ] Frontend: komponen `ProcessingStatus` dengan progress bar animasi

---

### Tahap 4 — Tax API Integration (Minggu 3, Hari 1-3)

**Target:** Setiap plat terdeteksi dicek ke API Pajak, hasilnya disimpan.

- [ ] Implementasi `tax_api.py`
  - Fungsi `check_tax(plate_number)` → return `tax_info` dict
  - Retry logic (3x dengan exponential backoff)
  - Timeout handling (5 detik per request)
  - Jika gagal → simpan `status="TAX_API_ERROR"` (tidak crash)
- [ ] Simpan hasil ke tabel `detections`:
  `plate_number`, `confidence`, `image_crop_url`, `tax_info_json`, `tax_status`, `detected_at`
- [ ] Endpoint `POST /detections/{id}/recheck` → trigger ulang tax check tanpa re-upload
- [ ] Endpoint `GET /videos/{id}/detections` → list hasil deteksi per video
- [ ] Update status video → `COMPLETED` setelah semua plat diproses
- [ ] Jika ada exception → update status → `FAILED` + simpan `error_message`

---

### Tahap 5 — Dashboard & Visualization (Minggu 3-4)

**Target:** Dashboard informatif dan siap digunakan operator.

#### Halaman Dashboard `/dashboard`

- [ ] Kartu statistik: Total Video, Total Plat Terdeteksi, Pajak Aktif, Pajak Mati/Kadaluarsa
- [ ] Grafik deteksi per hari (Recharts)

#### Halaman List Video `/dashboard/videos`

- [ ] Tabel: Filename, Upload Date, Status, Jumlah Plat, Aksi
- [ ] Filter by status, search by filename
- [ ] Pagination

#### Halaman Detail Video `/dashboard/videos/[id]`

- [ ] Info video + progress bar jika masih processing (WebSocket)
- [ ] Tabel deteksi: Foto Plat | Nomor Plat | Merk/Model | Status Pajak | Tgl Kadaluarsa | Aksi
- [ ] Tombol "Re-check" per baris jika status `TAX_API_ERROR`
- [ ] Tombol export CSV

#### Komponen UI

- [ ] `TaxStatusBadge`: hijau (ACTIVE), merah (EXPIRED), abu (ERROR)
- [ ] `ProcessingStatus`: progress bar real-time via WebSocket

---

### Tahap 6 — Security Hardening (Ongoing)

- [ ] Rate limiting pada endpoint upload (max 10 video/jam per user)
- [ ] File validation: cek magic bytes (bukan hanya ekstensi)
- [ ] Video processing di isolated worker container (bukan di API container)
- [ ] MinIO URL menggunakan presigned URL (expires 1 jam, bukan public)
- [ ] Semua secrets via environment variable (tidak hardcode)
- [ ] CORS whitelist hanya domain frontend
- [ ] JWT: access token 15 menit, refresh token 7 hari
- [ ] Input sanitasi nomor plat sebelum dikirim ke Tax API
- [ ] Docker: semua service berjalan sebagai non-root user

---

## Urutan Implementasi

```
Minggu 1  →  Foundation: Docker Compose, Auth, Upload, Celery skeleton
Minggu 2  →  AI Pipeline: Frame sampling, fast-alpr (detection+OCR), Dedup, WebSocket progress
Minggu 3  →  Integration: Tax API, Recheck endpoint, Dashboard halaman utama
Minggu 4  →  Polish: Detail page, Export CSV, Security hardening, Testing
```
