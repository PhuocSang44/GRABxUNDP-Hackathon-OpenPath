# RELIABILITY.md

How the system proves it is healthy and restartable.

## Standard Paths

- Bootstrap: `./init.sh` (installs deps, syntax-checks backend, builds + lints frontend)
- Backend start: `cd backend && uvicorn app.main:app --reload` → `http://localhost:8000`
- Frontend start: `cd frontend && npm run dev` → `http://localhost:3000`
- DB start: `docker run --name accessiblemap-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=accessiblemap -p 5432:5432 -d postgis/postgis`
- DB migrate: `cd backend && alembic upgrade head`
- DB seed: `cd backend && python scripts/seed.py`
- Health check: `curl -sf http://localhost:8000/ | grep running`

## Required Runtime Signals

- `GET /` returns `{"message": "Backend is running"}` — use this to confirm the API is up before running map tests
- `GET /api/points` returns a JSON array — empty array is valid; HTTP error means DB or model failure
- `GET /api/segments` returns a JSON array with `geometry` field — null geometry means PostGIS serialisation failed
- Frontend: map tiles load and markers appear within 3 seconds on localhost — if blank, check the browser console for CORS or API fetch errors

## Golden Journeys

1. **Map loads with points**: open `http://localhost:3000`, map centres on HCMC, coloured markers appear within 3 s
2. **Point detail**: click any marker → `PointPopup` shows name, score, category, and at least one feature or issue
3. **Filter by category**: open filter panel → select one category → marker count drops → reset → count returns to total
4. **Cluster expansion**: at zoom 12, clusters are visible → zoom in → individual markers appear

Each golden journey should be manually verified after any change to `AccessibilityMap.tsx`, `FilterPanel.tsx`, or `backend/app/api/points.py`.

## Reliability Rules

- No feature is complete if `./init.sh` fails after the change.
- If `GET /api/points` returns an HTTP error, diagnose from uvicorn logs before assuming a frontend bug.
- If markers disappear after a filter change without a console error, check `querySourceFeatures` — the tile loader layer may have been removed.
- PostGIS extension must be present before running migrations. Confirm with: `psql $DATABASE_URL -c "SELECT PostGIS_Version();"`.
- Cleanup (removing Docker containers, test data) is part of reliability — document any persistent side effects in the relevant plan.
