# AccessibleMap — Agent Instructions

An AI-enhanced accessibility map for wheelchair users in Ho Chi Minh City.
Displays road-segment accessibility (sidewalk quality, curb ramps, obstacles),
AI-analysed scores from Street View images, and accessible route recommendations.

This repository is designed for long-running coding-agent work. The goal is not
to maximise raw code output. The goal is to leave the repo in a state where the
next session can continue without guessing.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 / React 19 / TypeScript / Tailwind / MapLibre GL JS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL + PostGIS |
| Routing | OSRM |
| AI Vision | Vision-capable LLM (Claude / Gemini / GPT-4.1) |
| Map tiles | OpenStreetMap |
| Image source | Google Street View Static API |

## Repository Layout

```
/
├── backend/          FastAPI app (app/ structure)
├── frontend/         Next.js app (app/ router)
├── AGENTS.md         ← you are here
├── feature_list.json feature state
├── progress.md       session log
├── init.sh           startup + verification
└── session-handoff.md compact handoff (optional)
```

## Startup Workflow

Before writing any code:

1. Confirm working directory with `pwd`.
2. Read `progress.md` — latest verified state and next step.
3. Read `feature_list.json` — pick the highest-priority `not_started` or `in_progress` feature.
4. Review recent commits: `git log --oneline -5`.
5. Run `./init.sh`.
6. If baseline verification is already failing, fix that first. Do not stack new work on a broken base.

## Verification Commands

Run before claiming any feature complete:

```bash
# Backend — type check and startup smoke
cd backend && python -m py_compile app/main.py && echo "backend OK"

# Frontend — build (catches TS errors and missing imports)
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# API smoke (requires running backend)
curl -sf http://localhost:8000/ | grep "running"
```

Primary verification entrypoint: `./init.sh`

## Working Rules

- Work on one feature at a time. Stay in scope.
- Do not mark a feature `passing` just because code was added — run the verification.
- Keep changes within the selected feature unless a narrow supporting fix is unavoidable.
- Do not silently change verification rules during implementation.
- Prefer durable repo artifacts (`progress.md`, `feature_list.json`) over chat summaries.
- PostGIS and OSRM require Docker. If Docker is unavailable, note it as a blocker rather than skipping.

## Required Artifacts

- `feature_list.json` — source of truth for feature state
- `progress.md` — session log and current verified status
- `init.sh` — standard startup and verification path
- `session-handoff.md` — compact handoff for larger sessions

## Definition of Done

A feature is `passing` only when all of the following are true:

- The target behaviour is implemented and observable.
- The required verification commands actually ran without error.
- Evidence (command output, screenshot path, curl response) is recorded in `feature_list.json` or `progress.md`.
- The repository remains restartable from `./init.sh`.

## End of Session

Before ending any session:

1. Update `progress.md` with what was completed, what ran, and what is broken.
2. Update `feature_list.json` status and evidence fields.
3. Record any unresolved risk or blocker.
4. Commit with a descriptive message once the work is in a safe state.
5. Leave the repo clean enough for the next session to run `./init.sh` immediately.
