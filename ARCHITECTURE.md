# ARCHITECTURE.md

Top-level system map for OpenPath — HCMC Accessibility Map.

## System Shape

- Product: OpenPath — GIS accessibility map for wheelchair users in Ho Chi Minh City
- Primary user workflow: open map → browse or filter accessibility POIs → tap a point → read detail panel
- Runtime surfaces: web browser (frontend), HTTP API (backend), PostgreSQL + PostGIS (database)
- Source of truth for product behavior: `docs/product-specs/`

## Domain Map

| Domain | Purpose | Primary Entry Points | Related Spec |
|--------|---------|----------------------|--------------|
| `accessibility-points` | POI data (hospitals, ramps, parking, toilets, bus stops, reports, issues) | `backend/app/api/points.py`, `backend/app/models/accessibility_point.py` | `docs/product-specs/accessibility-map.md` |
| `road-segments` | Road-level sidewalk/surface metadata and accessibility scores | `backend/app/api/segments.py`, `backend/app/models/road_segment.py` | `docs/product-specs/accessibility-map.md` |
| `map-ui` | Interactive MapLibre map, clustering, markers, filter panel, popups | `frontend/components/AccessibilityMap.tsx`, `frontend/components/FilterPanel.tsx` | `docs/FRONTEND.md` |
| `ai-analysis` | Vision-LLM pipeline: Street View image → structured score → DB update | `backend/app/api/segments.py` (POST analyse — not yet implemented) | `feature_list.json` feat-004 |
| `routing` | Fastest vs. most-accessible route comparison via OSRM + weighted graph | not yet implemented | `feature_list.json` feat-005 |

## Layer Model

```
Types → Config → Models/Repos → Services → API/Runtime → UI
```

- **Types**: `frontend/lib/types.ts`, Pydantic schemas in `backend/app/schemas/`
- **Config**: `backend/app/core/config.py`, `.env` loaded via `python-dotenv`
- **Models/Repos**: SQLAlchemy models in `backend/app/models/`, data access in `backend/app/repositories/`
- **Services**: business logic in `backend/app/services/`
- **API/Runtime**: FastAPI routers in `backend/app/api/`, ASGI via uvicorn
- **UI**: Next.js pages in `frontend/app/`, components in `frontend/components/`, map helpers in `frontend/lib/`

Cross-cutting concerns (CORS, DB session, error handling) enter through explicit middleware or dependency injection, not inline.

## Hard Dependency Rules

- Frontend must only talk to the backend through `frontend/lib/api.ts` — no direct DB or env access.
- SQLAlchemy models must not contain business logic; logic lives in services.
- UI components must not fetch data directly; data must be fetched in `frontend/lib/api.ts` or a page component.
- PostGIS geometry columns must be serialised through `geoalchemy2.shape.to_shape` + `shapely.geometry.mapping` before leaving the backend; raw WKB must never appear in API responses.
- New Python dependencies must be added to `backend/requirements.txt`; new Node dependencies to `frontend/package.json`.

## Cross-Cutting Interfaces

| Concern | Approved Boundary | Notes |
|---------|-------------------|-------|
| CORS | `backend/app/main.py` — `CORSMiddleware` | Allows `http://localhost:3000` only |
| DB session | `get_db()` dependency injected per-request | Never share sessions across requests |
| Secrets | `backend/.env` loaded via `python-dotenv`; never committed | See `docs/SECURITY.md` |
| Map tile source | `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json` | Hard-coded in `AccessibilityMap.tsx`; change only with justification |
| External APIs | Google Street View (feat-004), OSRM (feat-005) | Keys in `.env`; not live during map load |

## Current Hot Spots

- `AccessibilityMap.tsx` — the map init, source update, and marker sync all run in one large `useEffect`. Fragile under rapid filter changes. See tech-debt-tracker.
- `backend/app/api/segments.py` — geometry serialisation is inline in the route handler; should move to a repository or serialiser layer once feat-004 adds mutations.
- PostGIS dependency — all geometry queries require PostGIS extension. If the DB lacks the extension, startup fails silently at query time, not at boot.

## Change Checklist

When you touch architecture-relevant code:

1. Update this file if a domain, entry point, or boundary changed.
2. Update the related design doc in `docs/design-docs/` if the reasoning changed.
3. Update `docs/QUALITY_SCORE.md` if a layer grade changed.
4. Add or update an executable check in `init.sh` if a rule should be enforced mechanically.
