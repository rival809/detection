# Manual Deployment Guide

## Prasyarat Server

- Ubuntu 22.04+
- Docker & Docker Compose v2
- Git

### Install Docker (jika belum)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

---

## Deploy Pertama Kali

### 1. Clone repo

```bash
git clone https://github.com/rival809/detection.git
cd detection
```

### 2. Buat file `.env`

```bash
cp .env.example .env
nano .env
```

Wajib diubah:

| Variable | Keterangan |
|---|---|
| `POSTGRES_PASSWORD` | Password kuat (min 16 karakter) |
| `DATABASE_URL` | Samakan password dengan `POSTGRES_PASSWORD` |
| `MINIO_ROOT_PASSWORD` & `MINIO_SECRET_KEY` | Password kuat |
| `SECRET_KEY` | Random string: `openssl rand -hex 32` |

Sudah di-set otomatis (tidak perlu ubah):

| Variable | Nilai |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://34.111.182.163` |
| `NEXT_PUBLIC_WS_URL` | `ws://34.111.182.163` |
| `BACKEND_CORS_ORIGINS` | `["http://34.111.182.163"]` |

### 3. Build & jalankan

```bash
docker compose up --build -d
```

> Build pertama butuh **15-30 menit** karena download:
> - Python packages (paddlepaddle, ultralytics, paddleocr ~1.5GB)
> - YOLOv8 plate detection model dari HuggingFace
> - Node.js packages

### 4. Cek semua service jalan

```bash
docker compose ps
```

Semua harus `running`:

```
NAME                STATUS
detection-postgres  running
detection-redis     running
detection-minio     running
detection-backend   running
detection-worker    running
detection-frontend  running
detection-nginx     running
```

### 5. Verifikasi health check

```bash
curl http://34.111.182.163/health | python3 -m json.tool
```

Response yang diharapkan:

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "minio": "ok"
  }
}
```

### 6. Akses aplikasi

| URL | Keterangan |
|---|---|
| `http://34.111.182.163` | Frontend (login/dashboard) |
| `http://34.111.182.163/docs` | Swagger API docs |
| `http://34.111.182.163:9001` | MinIO Console |

---

## Update Setelah Ada Perubahan Kode

```bash
cd ~/detection
git pull origin master
docker compose up --build -d
docker image prune -f
```

> Kalau hanya frontend yang berubah, hanya container `frontend` dan `nginx` yang rebuild.
> Kalau backend/requirements berubah, `backend` dan `worker` rebuild (lebih lama).

---

## Monitoring & Troubleshooting

### Lihat log real-time

```bash
# Semua service
docker compose logs -f

# Per service
docker compose logs -f backend
docker compose logs -f worker
docker compose logs -f nginx
```

### Restart satu service

```bash
docker compose restart backend
docker compose restart worker
```

### Masuk ke container

```bash
docker compose exec backend bash
docker compose exec postgres psql -U detection_user -d detection_db
```

### Cek database

```bash
docker compose exec postgres psql -U detection_user -d detection_db -c "\dt"
```

---

## Troubleshooting Umum

### Build gagal di step `pip install`

Cek package yang error di log, lalu lihat apakah ada update di `requirements.txt` terbaru:

```bash
git log --oneline -5
git pull origin master
docker compose up --build -d
```

### Service `backend` terus restart

```bash
docker compose logs backend --tail=50
```

Biasanya karena:
- `.env` belum dibuat atau ada variable yang kosong
- Database belum ready saat backend start (tunggu 30 detik, lalu `docker compose restart backend`)

### Port 80 sudah dipakai

```bash
sudo lsof -i :80
sudo systemctl stop nginx   # jika nginx host berjalan
```

### Minio tidak bisa diakses

```bash
docker compose logs minio --tail=20
```

---

## Update Token Tax API (jika expired)

Token Tax API (Bapenda Jabar) punya masa berlaku. Jika cek pajak selalu return `ERROR`:

1. Ambil token baru dari browser (buka app Sakti → DevTools → Network → cari request ke `apisakti.bapenda.jabarprov.go.id` → copy Bearer token)
2. Edit file di lokal:
   ```
   backend/app/services/tax_api.py  →  baris TAX_API_TOKEN = "..."
   ```
3. Push dan update server:
   ```bash
   git push origin master
   # di server:
   git pull && docker compose up --build -d backend worker
   ```

---

## Cek Status GitHub Actions (CI)

Setiap `git push` ke master otomatis menjalankan lint + test di GitHub:

```
https://github.com/rival809/detection/actions
```

Pastikan CI hijau sebelum deploy ke server.
