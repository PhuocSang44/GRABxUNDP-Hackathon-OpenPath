# SECURITY.md

Security and safety rules that agents must not guess at.

## Secrets and Credentials

Never hard-code secrets in source or docs. Approved secret-loading path: `backend/.env` via `python-dotenv`.

Required `.env` variables:

```
DATABASE_URL=postgresql://user:password@localhost:5432/accessiblemap
GOOGLE_STREET_VIEW_API_KEY=...   # required for feat-004 AI analysis
LLM_API_KEY=...                  # required for feat-004 (Claude / GPT-4 / Gemini)
```

- `.env` is in `.gitignore`. Never commit it.
- Redact all API keys and tokens from logs, screenshots, and chat.
- If a key is needed for a demo, use a scoped, rate-limited key and rotate it after the hackathon.

## Untrusted Input

- `GET /api/segments` and `GET /api/points` currently have no query parameters — no injection surface.
- When feat-006 (community reporting) adds a `POST /api/reports` endpoint, all free-text fields (`description`) must be validated and length-capped at the Pydantic schema layer before reaching the DB.
- PostGIS geometry inputs (future WKT/WKB) must be validated with `geoalchemy2` type constraints, not raw string interpolation.

## External Actions

Agents must not run these without explicit user approval:

- `git push` to any remote
- `alembic downgrade` or any migration that drops or truncates tables
- `docker rm` or `docker stop` on a running DB container
- Any live API call to Google Street View or LLM providers (use pre-fetched fixture data during development)

## Dependency and Review Rules

- New Python packages: add to `backend/requirements.txt` and document the reason in the active plan.
- New Node packages: add to `frontend/package.json` and document the reason in the active plan.
- Security-sensitive changes (auth, external API wiring, file upload) require an explicit verification step recorded in the plan.
- If a repeated security review comment appears, convert it into a linter rule or automated check rather than repeating it in chat.
