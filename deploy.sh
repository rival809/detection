#!/bin/bash
set -e

echo "==> Pulling latest code..."
git pull origin master

echo "==> Copying .env if not exists..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  [!] .env dibuat dari .env.example — edit dulu sebelum lanjut!"
  echo "      nano .env"
  exit 1
fi

echo "==> Running database migrations..."
docker compose run --rm backend alembic upgrade head

echo "==> Building & starting services..."
docker compose up --build -d

echo "==> Cleaning up old images..."
docker image prune -f

echo ""
echo "==> Done! Services running at http://34.111.182.163"
echo "    Logs: docker compose logs -f"
