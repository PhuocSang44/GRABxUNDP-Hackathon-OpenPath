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

Once `app/main.py` is in place, start the backend with:

```bash
uvicorn app.main:app --reload
```
