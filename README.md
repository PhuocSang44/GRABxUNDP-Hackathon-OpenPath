# OpenPath — AI-Powered Accessibility Map for Ho Chi Minh City

OpenPath is a GIS-powered accessibility map built for the **GRAB × UNDP Hackathon**. It helps wheelchair users and people with mobility challenges plan safe, accessible journeys across HCMC by combining community-reported data, multi-modal trip planning, and **real Claude Vision AI analysis** of sidewalk conditions.

---

## Key Features

### AI Route Analysis
A unified panel (one button — **"AI Route"**) that combines two complementary tools:

#### Accessibility Check
- Click any destination on the map to plan a walking route
- The route is broken into checkpoints every ~75 m
- Each checkpoint is analyzed by **Claude Vision AI** (Anthropic) from a real street-level photo
- Results show: sidewalk availability, surface quality, width, curb ramps, obstacles
- An aggregate summary gives the overall accessibility rating (Good / Moderate / Poor)
- **Demo mode**: load a pre-analyzed real route (Binh Duong area) with 11 on-site photos — no API call needed, loads from static JSON instantly

#### Trip Planner
- Select a destination from major HCMC landmarks
- AI plans a multi-modal route: Accessible Taxi → Metro Line 1 → Low-floor Bus → Walking
- Each leg shows accessibility info, warnings, and duration
- Route is drawn on the map color-coded by transport mode

### Accessibility Map
- Interactive map centred on HCMC (MapLibre GL JS)
- 8 accessibility point categories: parking, ramps, hospitals, toilets, bus stops, entrances, community reports, accessibility issues
- Cluster markers at low zoom with photo thumbnails; individual markers at high zoom
- Click any marker to see score, address, facilities, and photos

### Filters
- Filter by category and minimum accessibility score
- Live count of visible vs total locations

### Community Reporting
- Click anywhere on the map to file a report with location, category, and photo
- Reports go through admin verification before appearing on the map

### Admin Dashboard
- JWT-authenticated admin panel at `/admin`
- Verify or reject pending community reports

---

## Architecture

```
frontend/          Next.js 15 (App Router) · MapLibre GL JS · Tailwind CSS
backend/           FastAPI · SQLAlchemy · PostgreSQL/PostGIS (Supabase)
```

### AI Pipeline (Route Analysis)

```
User picks destination
       ↓
OSRM public routing API → walking route (GeoJSON LineString)
       ↓
Sample checkpoints every 75 m along route (Haversine)
       ↓
For each checkpoint:
  1. Fetch street-level photo (Mapillary API or Google Street View)
  2. Upload photo to Supabase Storage
  3. Analyze with Claude Vision (claude-haiku-4-5) → JSON accessibility data
  4. Cache result in PostgreSQL
       ↓
Aggregate results → RouteResult JSON
       ↓
Frontend renders route line + colored checkpoint markers
```

**Demo mode** bypasses steps 1–4 entirely: the seed script pre-runs the pipeline once, saves the output to `frontend/public/demo/demo_route.json`, and the frontend loads it directly via `fetch("/demo/demo_route.json")`.

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL with PostGIS (`docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgis/postgis`)

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # set DATABASE_URL, ANTHROPIC_API_KEY, MAPILLARY_ACCESS_TOKEN
alembic upgrade head   # creates all tables including accessibility_checkpoints
python scripts/seed.py # populates accessibility POIs
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev
```

### Demo Route (no API keys needed)

The demo route ships with pre-generated data:

```bash
# Optional: regenerate demo JSON from manually-edited checkpoint data
cd backend
python scripts/seed_demo_manual.py
# Writes frontend/public/demo/demo_route.json
```

Checkpoint photos are in `frontend/public/demo/checkpoints/cp1.jpg … cp11.jpg` (real on-site photos).

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/api/points` | All accessibility POIs |
| GET | `/api/segments` | Road segments with accessibility metadata |
| POST | `/api/route/analyze` | Analyze a walking route (origin + destination coords) |
| POST | `/api/reports` | Submit a community report |
| GET | `/api/reports/unverified` | Admin: list pending reports |
| PATCH | `/api/reports/{id}/verify` | Admin: approve a report |
| DELETE | `/api/reports/{id}` | Admin: reject a report |
| POST | `/api/auth/login` | JWT login |

### Route Analyze request body

```json
{
  "origin_lat": 10.877073,
  "origin_lng": 106.800561,
  "dest_lat": 10.877044,
  "dest_lng": 106.802880
}
```

---

## Accessibility Score Bands

| Score | Label | Colour |
|-------|-------|--------|
| 90–100 | Excellent | Green |
| 70–89 | Good | Light green |
| 50–69 | Moderate | Yellow |
| 30–49 | Limited | Orange |
| 0–29 | Poor | Red |

## Point Categories

`accessible_parking` · `hospital` · `accessible_toilet` · `wheelchair_ramp` · `accessible_entrance` · `bus_stop` · `community_report` · `accessibility_issue`

---

## Environment Variables

### Backend `.env`
```
DATABASE_URL=postgresql://user:pass@localhost:5432/openpath
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET_KEY=change-me-in-production
ANTHROPIC_API_KEY=sk-ant-...
MAPILLARY_ACCESS_TOKEN=MLY|...
GOOGLE_MAPS_API_KEY=AIza...   # optional, falls back to Mapillary
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Map rendering | MapLibre GL JS + CartoDB Voyager tiles |
| Routing | OSRM public API (walking profile) |
| AI vision | Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) |
| Street imagery | Mapillary API v4 (free) / Google Street View |
| Backend | FastAPI + SQLAlchemy + Alembic |
| Database | PostgreSQL + PostGIS (hosted on Supabase) |
| File storage | Supabase Storage |
| Frontend | Next.js 15 (App Router) + React 19 + Tailwind CSS |
| Auth | JWT (python-jose / pyjwt) + bcrypt |
