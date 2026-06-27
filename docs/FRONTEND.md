# FRONTEND.md

Stable frontend expectations so agents do not invent UI patterns unpredictably.

## UI Principles

- Map is the primary surface. Every feature should be reachable without leaving the map view.
- Filter state is transient — it lives in React state and resets on refresh. Do not persist to localStorage unless explicitly planned.
- Accessibility score is always shown as a number (0–100) paired with a colour band label. Never show a score without both.
- Category labels in the filter panel, the marker aria-label, and the popup header must match `CATEGORY_CONFIG` in `frontend/lib/markers.ts` exactly.

## Map Constraints (MapLibre GL JS)

- The map instance lives in `mapRef.current`. It is initialised once in a `useEffect` with an empty dep-array. Do not re-initialise on prop or state changes.
- Marker sync (cluster vs. individual) runs on the `render` event after `isMoving()` and `isSourceLoaded("points")` are both false. Do not move this logic to `moveend` — it creates a visible lag.
- `MapLibre.Marker` sets `transform:translate()` on the wrapper element. Never put CSS transitions on `transform` or `translate` at the wrapper level — they will collide with MapLibre. Put hover scale and transitions on an inner element (the `circle` div pattern used throughout `AccessibilityMap.tsx`).
- The `points-tile-loader` invisible layer must remain registered. Without it, `querySourceFeatures` returns nothing because MapLibre does not load source tiles unless a layer references the source.

## Component Inventory

| Component | Responsibility | Do Not Put Here |
|-----------|---------------|-----------------|
| `AccessibilityMap` | map lifecycle, source data, marker sync | business logic, data fetching |
| `FilterPanel` | filter UI, emit `onChange` | filter application logic (that lives in `applyFilters`) |
| `PointPopup` | render one selected point's detail | list views, cluster content |
| `ClusterGallery` | photo gallery for cluster members | individual point detail |
| `Legend` | static score band legend | dynamic state |

## Guardrails

- Do not fetch data inside components. Data is fetched in `frontend/app/page.tsx` (server component) and passed as props.
- All new categories must be added to `CATEGORY_CONFIG` in `frontend/lib/markers.ts` before rendering. Markers for unknown categories are silently skipped.
- Score colour must come from `getScoreColor(score)` in `frontend/lib/markers.ts`. Do not hard-code colour values in components.
- Keep copy, keyboard behavior, and visual hierarchy consistent across filter panel, popup, and gallery.

## Verification Expectations

- `npm run build` (exit 0, no TypeScript errors) is required after every frontend change.
- `npm run lint` must pass.
- Manually verify golden journeys in `docs/RELIABILITY.md` after any change to `AccessibilityMap.tsx` or `FilterPanel.tsx`.
- If a visual regression is introduced, add a specific note to the active plan describing what to check manually.
