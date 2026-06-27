#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "==> Working directory: $PWD"

# ── Backend ────────────────────────────────────────────────────────────────────
echo ""
echo "==> [Backend] Installing Python dependencies"
cd "$ROOT_DIR/backend"
pip install -r requirements.txt -q

echo "==> [Backend] Syntax check"
python -m py_compile app/main.py
echo "    app/main.py OK"

# ── Frontend ───────────────────────────────────────────────────────────────────
echo ""
echo "==> [Frontend] Installing Node dependencies"
cd "$ROOT_DIR/frontend"
npm install --silent

echo "==> [Frontend] Type-check + build"
npm run build

echo "==> [Frontend] Lint"
npm run lint

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "==> Baseline verification passed."
echo ""
echo "    To start the backend:"
echo "      cd backend && uvicorn app.main:app --reload"
echo ""
echo "    To start the frontend:"
echo "      cd frontend && npm run dev"
echo ""
echo "    PostGIS (required for DB features):"
echo "      docker run --name accessiblemap-db \\"
echo "        -e POSTGRES_PASSWORD=password \\"
echo "        -e POSTGRES_DB=accessiblemap \\"
echo "        -p 5432:5432 -d postgis/postgis"
echo ""
echo "    OSRM (required for route features):"
echo "      See feat-005 notes in feature_list.json."
echo ""

if [ "${RUN_START_COMMAND:-0}" = "1" ]; then
  echo "==> Starting backend (foreground)"
  cd "$ROOT_DIR/backend"
  exec uvicorn app.main:app --reload
fi

echo "Set RUN_START_COMMAND=1 to launch the backend directly from this script."
