# OpenPath — Accessibility Map for Ho Chi Minh City

OpenPath is a GIS-powered accessibility map built for the GRAB x UNDP Hackathon. It surfaces wheelchair-accessible locations across District 1, HCMC — parking, ramps, hospitals, toilets, bus stops, and community-reported issues — so that people with mobility challenges can plan journeys with confidence.

## What it does

- Displays an interactive map centred on HCMC, populated with categorised accessibility points
- Clusters nearby points at low zoom; expands to individual markers as you zoom in
- Each marker opens a detail panel: score, address, features (ramp, toilet, parking, elevator), and issues
- A filter panel lets users narrow results by category, minimum accessibility score, and facility flags
- Cluster markers show a photo thumbnail sampled from their contained points

## Architecture

```
frontend/   Next.js 15 app (MapLibre GL JS map, React components)
backend/    FastAPI + SQLAlchemy + PostGIS (Python)
```

The backend exposes a REST API consumed by the frontend. The database is PostgreSQL with the PostGIS extension.

## Running locally

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL with PostGIS (`docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgis/postgis`)

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # set DATABASE_URL
alembic upgrade head           # creates road_segments + accessibility_points tables
python scripts/seed.py         # populates ~20 road segments and POIs
uvicorn app.main:app --reload  # runs on http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # runs on http://localhost:3000
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check — returns `{"message": "Backend is running"}` |
| GET | `/api/segments` | All road segments with accessibility metadata |
| GET | `/api/points` | All accessibility POIs with category, score, and facility flags |

## Accessibility score bands

| Score | Label | Colour |
|-------|-------|--------|
| 90–100 | Excellent | Green |
| 70–89 | Good | Light green |
| 50–69 | Moderate | Yellow |
| 30–49 | Limited | Orange |
| 0–29 | Poor | Red |

## Point categories

`accessible_parking` · `hospital` · `accessible_toilet` · `wheelchair_ramp` · `accessible_entrance` · `bus_stop` · `community_report` · `accessibility_issue`
