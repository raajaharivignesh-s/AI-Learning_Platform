# Setup Guide

1. **Environment**: Copy `.env.example` to `.env` and set values.
2. **Docker**: Run `docker compose up -d db` to start the database on port 5433.
3. **Virtual Env**: Run `python -m venv venv` and `venv\Scripts\activate`.
4. **Install**: Run `pip install -r requirements.txt`.
5. **Migrations**: Run `alembic upgrade head`.
6. **Run**: Run `uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload`.
7. **Test**: Run `pytest`.

To completely stop the project safely without affecting other running Docker containers:
```bash
docker compose down
```
*(Do not use `docker compose down -v` unless you intend to destroy the local development database).*
