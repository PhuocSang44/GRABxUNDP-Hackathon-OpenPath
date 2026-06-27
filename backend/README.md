# Backend

This is the Python backend for the project, organized under an `app/` structure that cleanly separates the API, services, repositories, models, schemas, database, and core configuration.

## Installation

```bash
pip install -r requirements.txt
```

## Directory Structure

- `app/api/`: router declarations and FastAPI endpoints.
- `app/services/`: business logic.
- `app/repositories/`: data access and queries.
- `app/models/`: SQLAlchemy model definitions.
- `app/schemas/`: Pydantic schemas for requests and responses.
- `app/db/database.py`: database connection configuration.
- `app/core/`: application config, settings, constants, and core utilities.
- `app/main.py`: FastAPI application entry point.

## Package Overview

- `fastapi`: modern web framework for building APIs quickly, with type hints and auto-generated OpenAPI documentation.
- `uvicorn`: ASGI server for running the FastAPI application in development and production.
- `sqlalchemy`: ORM and database query toolkit.
- `psycopg2-binary`: PostgreSQL driver used by SQLAlchemy to connect to PostgreSQL.
- `python-dotenv`: reads environment variables from a `.env` file.
- `pydantic-settings`: application configuration management via Pydantic Settings (`Settings`/`BaseSettings`).
- `alembic`: database schema migration tool.
- `supabase`: SDK for integrating with Supabase for auth, storage, database, or Supabase APIs.

## Running the Application

```bash
cp .env.example .env        # set DATABASE_URL to your PostGIS connection string
alembic upgrade head         # run schema migrations
python scripts/seed.py       # seed ~20 road segments and accessibility POIs
uvicorn app.main:app --reload
```

The server starts at `http://localhost:8000`. Auto-generated OpenAPI docs are at `/docs`.

## API endpoints

### Health

```
GET /
→ {"message": "Backend is running"}
```

### Road segments

```
GET /api/segments
→ [
    {
      "id": 1,
      "name": "Nguyen Hue Walking Street",
      "geometry": { "type": "LineString", "coordinates": [...] },
      "sidewalk": true,
      "sidewalk_side": "both",
      "width_m": 2.5,
      "surface": "concrete",
      "curb_ramp": true,
      "obstacles": [],
      "stairs": false,
      "accessibility_score": 85,
      "confidence": 0.9,
      "source": "manual"
    },
    ...
  ]
```

Scores are integers 0–100. `source` is one of `ai | community | manual`.

### Accessibility points (POIs)

```
GET /api/points
→ [
    {
      "id": 1,
      "name": "Ben Thanh Hospital",
      "category": "hospital",
      "lat": 10.7731,
      "lng": 106.6983,
      "accessibility_score": 78,
      "address": "201 Nguyen Chi Thanh, District 1",
      "description": "...",
      "features": ["ramp", "elevator"],
      "issues": [],
      "verified": true,
      "has_ramp": true,
      "has_toilet": true,
      "has_parking": false,
      "has_elevator": true,
      "is_community_report": false,
      "last_updated": "2026-06-27T00:00:00+00:00"
    },
    ...
  ]
```

Categories: `accessible_parking` · `hospital` · `accessible_toilet` · `wheelchair_ramp` · `accessible_entrance` · `bus_stop` · `community_report` · `accessibility_issue`
