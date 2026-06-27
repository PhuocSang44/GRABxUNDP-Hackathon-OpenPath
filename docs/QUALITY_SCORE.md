# QUALITY_SCORE.md

Tracks whether the repository is getting stronger or weaker over time.

## Grading Scale

- `A`: verified, legible, stable, boundaries enforced
- `B`: working with minor gaps
- `C`: partially working, notable confusion or instability
- `D`: broken, unsafe, or structurally unclear

## Product Domains

| Domain | Grade | Verification | Agent Legibility | Test Stability | Key Gaps | Last Updated |
|--------|-------|-------------|-----------------|---------------|----------|-------------|
| accessibility-points | B | GET /api/points returns data; no automated assertion | Good — model + schema + route are clear | No tests | No unit tests; seed-only data | 2026-06-28 |
| road-segments | B | GET /api/segments returns GeoJSON; build passes | Good | No tests | No unit tests | 2026-06-28 |
| map-ui | B | npm run build exit 0; visual check manual only | Good — components are named clearly | No automated UI tests | No E2E; filter behavior untested automatically | 2026-06-28 |
| ai-analysis | D | Not implemented | N/A | N/A | feat-004 not started | 2026-06-28 |
| routing | D | Not implemented | N/A | N/A | feat-005 not started | 2026-06-28 |
| community-reporting | D | Not implemented | N/A | N/A | feat-006 not started | 2026-06-28 |

## Architectural Layers

| Layer | Grade | Boundary Enforcement | Agent Legibility | Key Gaps | Last Updated |
|-------|-------|---------------------|-----------------|----------|-------------|
| Types | A | `frontend/lib/types.ts` + Pydantic schemas are canonical | Clear — no circular imports observed | Minor: RoadSegment kept for API compat but not used in map | 2026-06-28 |
| Models/Repos | B | SQLAlchemy models clean; repositories directory is empty | Models clear; repo layer unused | Repository layer skeleton only; all DB access is inline in routes | 2026-06-28 |
| Services | C | Services directory is empty; logic is inline in routes | Low — no service boundary yet | All business logic lives in route handlers | 2026-06-28 |
| API/Runtime | B | FastAPI routers registered in `main.py`; CORS correct | Good | No request validation on GET endpoints; error handling minimal | 2026-06-28 |
| UI | B | Data fetch in `lib/api.ts`; rendering in components | Good — component names match domain concepts | `AccessibilityMap.tsx` is a large monolith; marker sync logic complex | 2026-06-28 |

## Benchmark Snapshots

| Date | Harness Variant | Completion Rate | Retries | Defects Before Review | Notes |
|------|-----------------|----------------|--------|-----------------------|------|
| 2026-06-27 | minimal (AGENTS.md + feature_list + progress + init.sh) | feat-001–003 passing | — | — | First session baseline |
| 2026-06-28 | openai-advanced (+ docs/ tree) | — | — | — | Harness upgraded; no new features yet |

## Simplification Log

| Date | Component Removed | Outcome | Decision |
|------|-------------------|---------|----------|
| — | — | — | — |
