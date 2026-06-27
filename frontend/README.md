# OpenPath Frontend

Next.js 15 app that renders the HCMC accessibility map.

## Running

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint    # ESLint check
```

The backend must be running at `http://localhost:8000` (configured via CORS in `app/main.py`).

## Map features

**Clustered POI map** — accessibility points from `GET /api/points` are rendered as category-coloured circle markers using MapLibre GL JS. At low zoom levels nearby points cluster into a single bubble showing the count; clicking a cluster either zooms in or opens a gallery of photos from its members.

**Point categories**

| Category | Colour |
|----------|--------|
| Accessible Parking | Blue |
| Hospital | Red |
| Accessible Toilet | Cyan |
| Wheelchair Ramp | Green |
| Accessible Entrance | Purple |
| Bus Stop | Orange |
| Community Report | Yellow |
| Accessibility Issue | Dark red |

**Point detail popup** — clicking any individual marker opens a panel with: name, address, accessibility score (with colour band label), facility flags (ramp, toilet, parking, elevator), features list, issues list, verification status, and last updated date.

**Filter panel** — a slide-in panel (top-left "Filters" button) lets users narrow visible points by:
- Category checkboxes
- Minimum accessibility score (0–100 slider)
- Reset all to defaults

The location counter `N / Total locations` updates live as filters change.

**Score bands**

| Score | Label |
|-------|-------|
| 90–100 | Excellent |
| 70–89 | Good |
| 50–69 | Moderate |
| 30–49 | Limited |
| 0–29 | Poor |

## Key files

- `components/AccessibilityMap.tsx` — map init, clustering, marker sync, filter wiring
- `components/FilterPanel.tsx` — slide-in filter UI
- `components/PointPopup.tsx` — detail panel for a selected point
- `components/map/ClusterGallery.tsx` — photo gallery for cluster members
- `lib/types.ts` — `AccessibilityPoint`, `FilterState`, `PointCategory` types
- `lib/markers.ts` — `CATEGORY_CONFIG` and score band helpers
- `lib/photos.ts` — photo lookup by point id and category
- `lib/api.ts` — `GET /api/points` fetch
