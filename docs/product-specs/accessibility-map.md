# Product Spec: Accessibility Map

Core map experience for OpenPath.

## Goal

Enable wheelchair users and people with limited mobility to discover and evaluate accessible locations in District 1, Ho Chi Minh City before and during a journey.

## Entry Conditions

- User opens `http://localhost:3000` in a browser.
- Backend is running at `http://localhost:8000`.
- At least one accessibility point exists in the database (via seed data).

## User Flow

1. Map loads centred on HCMC (lng 106.7031, lat 10.7731) at zoom 14.
2. Accessibility points appear as coloured circle markers with category icons. Nearby points are grouped into cluster bubbles showing a count.
3. User can open the filter panel (top-left "Filters" button) to narrow visible points by:
   - Category (checkboxes for each of the 8 categories)
   - Minimum accessibility score (0–100 slider)
4. The location counter (`N / Total locations`) updates immediately as filters change.
5. Clicking a cluster zooms in to expand it; if the cluster has photos, a gallery panel opens showing photos from its members.
6. Clicking an individual marker opens the `PointPopup` detail panel showing:
   - Name and address
   - Category label
   - Accessibility score (number + colour band label: Excellent / Good / Moderate / Limited / Poor)
   - Facility flags: wheelchair ramp, accessible toilet, accessible parking, elevator
   - Features list and issues list
   - Verification status and last updated date
7. Clicking "Reset all filters" returns to showing all locations.

## Acceptance Criteria

- Map loads and markers are visible within 3 seconds on localhost.
- Clicking a marker opens the popup with a non-null name and score.
- Filtering by a single category leaves only markers of that category visible.
- Resetting filters restores the full marker set without a page reload.
- `npm run build` exits 0 with no TypeScript errors after any change.
- `npm run lint` exits 0 after any change.

## Failure States

- **Backend unreachable**: map tiles load but no markers appear. There is currently no user-visible error state — this is a known gap (see tech-debt-tracker).
- **Empty category filter**: selecting a category with no matching points produces an empty map with the counter showing `0 / N`. This is correct behavior.
- **Cluster with no photos**: cluster gallery opens but displays no photo cards. This is correct behavior — not all points have photos.

## Score Band Reference

| Score | Label | Marker ring colour |
|-------|-------|-------------------|
| 90–100 | Excellent | `#16a34a` |
| 70–89 | Good | `#22c55e` |
| 50–69 | Moderate | `#eab308` |
| 30–49 | Limited | `#f97316` |
| 0–29 | Poor | `#ef4444` |

## Category Reference

| Category key | Label | Marker colour |
|-------------|-------|---------------|
| `accessible_parking` | Accessible Parking | `#3b82f6` |
| `hospital` | Hospital | `#ef4444` |
| `accessible_toilet` | Accessible Toilet | `#06b6d4` |
| `wheelchair_ramp` | Wheelchair Ramp | `#22c55e` |
| `accessible_entrance` | Accessible Entrance | `#8b5cf6` |
| `bus_stop` | Bus Stop | `#f97316` |
| `community_report` | Community Report | `#eab308` |
| `accessibility_issue` | Accessibility Issue | `#dc2626` |
