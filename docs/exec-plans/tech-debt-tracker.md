# Tech Debt Tracker

Debt that is real, acknowledged, and intentionally deferred.

| Date | Area | Debt | Why Deferred | Risk | Next Trigger |
|------|------|------|--------------|------|--------------|
| 2026-06-27 | map-ui | `AccessibilityMap.tsx` is a large monolith — map init, marker sync, cluster logic, and filter wiring in one file | Hackathon timeline; splitting would delay feat-003 | Changes to any marker behavior require reading the whole file | When feat-005 (routing) adds a second marker type |
| 2026-06-27 | backend | Repository layer is empty; all DB access is inline in route handlers | Hackathon timeline | Adding mutations (feat-004, feat-006) will create code duplication | Before feat-004 adds `POST /api/segments/{id}/analyse` |
| 2026-06-27 | backend | Service layer is empty; business logic is inline in routes | Same as above | Score computation and LLM parsing will be hard to test inline | Before feat-004 |
| 2026-06-27 | map-ui | No user-visible error state when backend is unreachable | Hackathon timeline | Users see a blank map with no explanation | Before public demo |
| 2026-06-28 | frontend | `progress.md` session 001 lists `InfoPanel.tsx` as created but the actual map now uses `PointPopup.tsx` | UI evolved during session 001 | Misleads future agents reading the session log | Update progress.md in next session |
