# feat-004: AI Accessibility Analysis Pipeline

## Objective

Implement `POST /api/segments/{id}/analyse`: fetch a Google Street View Static API image for a road segment's midpoint coordinate, send it to a vision LLM, parse the structured JSON response, and persist the updated accessibility fields and score to the DB.

## Scope

**In scope:**
- `POST /api/segments/{id}/analyse` endpoint
- Street View image fetch (GOOGLE_STREET_VIEW_API_KEY from `.env`)
- Vision LLM call (LLM_API_KEY from `.env`) with structured JSON output
- DB update: `sidewalk`, `sidewalk_side`, `width_m`, `surface`, `curb_ramp`, `obstacles`, `stairs`, `accessibility_score`, `confidence`, `source="ai"`
- Response: updated segment object

**Out of scope:**
- Live analysis during map load (demo uses pre-seeded scores)
- Frontend "Analyse" button (can be added later; MVP is API-only)
- Batch analysis of all segments
- feat-005 routing or feat-006 reporting

## Prerequisites / Blockers

- `GOOGLE_STREET_VIEW_API_KEY` in `backend/.env`
- `LLM_API_KEY` in `backend/.env` (Claude, GPT-4.1, or Gemini — pick one)
- PostGIS running and `road_segments` seeded (verify with `curl http://localhost:8000/api/segments`)

## Verification Path

```bash
# 1. Endpoint exists
curl -sf -X POST http://localhost:8000/api/segments/1/analyse | python -m json.tool | grep confidence

# 2. DB row updated (requires psql)
psql $DATABASE_URL -c "SELECT accessibility_score, confidence, source FROM road_segments WHERE id=1"

# 3. Frontend build still passes
cd frontend && npm run build

# 4. init.sh passes
./init.sh
```

All four checks must pass before marking feat-004 `passing` in `feature_list.json`.

## Risks

- Google Street View API returns a "no imagery" placeholder for some HCMC coordinates — handle gracefully (return 422 or skip analysis).
- Vision LLM may return malformed JSON — add a parsing fallback and record `confidence=0` on failure.
- Rate limits on both APIs — use cached fixture responses during development, live API only for demo.

## Progress Log

*(append-only)*

- 2026-06-28: Plan created. feat-004 is `not_started`. Prerequisites not yet confirmed.

## Open Decisions

- Which vision LLM? Claude claude-sonnet-4-6 (multimodal), GPT-4.1-vision, or Gemini 2.5 Pro. Pick based on available API key. Default to Claude claude-sonnet-4-6 if no preference.
- Prompt engineering: should the LLM return a fixed JSON schema or free-form scored text? Fixed schema is strongly preferred for reliable parsing.
- Where to put LLM call: `backend/app/services/ai_analysis.py` (new service) — do not inline in the route handler, given the repository layer debt already noted in tech-debt-tracker.
