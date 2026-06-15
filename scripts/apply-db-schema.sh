#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "  export DATABASE_URL='postgresql://...'   # External URL from Render"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found. Install: brew install libpq && brew link --force libpq"
  exit 1
fi

echo "Applying db/nailsbyni/001_schema.sql ..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/nailsbyni/001_schema.sql

echo ""
echo "Running db/nailsbyni/verify.sql ..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/nailsbyni/verify.sql

echo ""
echo "Schema ready. Set DATABASE_URL on Render for live bookings and site data."
echo "Gallery images use S3 — see .env.example."
