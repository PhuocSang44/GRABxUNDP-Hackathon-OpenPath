# Database Schema

Auto-generated reference. Update when Alembic migrations change the schema.
Last updated: 2026-06-28

## Table: road_segments

Primary source of truth: `backend/app/models/road_segment.py`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | INTEGER | NOT NULL | autoincrement | Primary key |
| name | VARCHAR | NULL | — | Human-readable segment name |
| geometry | GEOMETRY(LINESTRING, 4326) | NOT NULL | — | PostGIS geometry; serialised via `to_shape` + `mapping` |
| sidewalk | BOOLEAN | NULL | — | Whether a sidewalk exists |
| sidewalk_side | VARCHAR | NULL | — | `left \| right \| both \| none` |
| width_m | FLOAT | NULL | — | Sidewalk width in metres |
| surface | VARCHAR | NULL | — | `concrete \| asphalt \| tiles \| dirt \| other` |
| curb_ramp | BOOLEAN | NULL | — | Whether a kerb ramp is present |
| obstacles | JSON | NULL | — | List of obstacle strings |
| stairs | BOOLEAN | NULL | — | Whether stairs are present |
| accessibility_score | INTEGER | NULL | — | 0–100 |
| confidence | FLOAT | NULL | — | 0.0–1.0 (from AI analysis) |
| source | VARCHAR | NULL | `"manual"` | `ai \| community \| manual` |
| created_at | TIMESTAMPTZ | NOT NULL | `now()` | |
| updated_at | TIMESTAMPTZ | NULL | `now()` on update | |

## Table: accessibility_points

Primary source of truth: `backend/app/models/accessibility_point.py`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | INTEGER | NOT NULL | autoincrement | Primary key |
| name | VARCHAR | NOT NULL | — | |
| category | VARCHAR | NOT NULL | — | One of the 8 `PointCategory` values |
| lat | FLOAT | NOT NULL | — | WGS-84 latitude |
| lng | FLOAT | NOT NULL | — | WGS-84 longitude |
| accessibility_score | INTEGER | NOT NULL | — | 0–100 |
| address | VARCHAR | NULL | — | |
| description | VARCHAR | NULL | — | |
| features | JSON | NULL | `[]` | List of feature strings |
| issues | JSON | NULL | `[]` | List of issue strings |
| verified | BOOLEAN | NULL | `false` | Manually verified by a human |
| has_ramp | BOOLEAN | NULL | `false` | |
| has_toilet | BOOLEAN | NULL | `false` | |
| has_parking | BOOLEAN | NULL | `false` | |
| has_elevator | BOOLEAN | NULL | `false` | |
| is_community_report | BOOLEAN | NULL | `false` | |
| last_updated | TIMESTAMPTZ | NULL | `now()` | |

## PointCategory Values

`accessible_parking` · `hospital` · `accessible_toilet` · `wheelchair_ramp` · `accessible_entrance` · `bus_stop` · `community_report` · `accessibility_issue`
