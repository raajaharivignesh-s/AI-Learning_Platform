# Adaptive Learning Platform (Phase 1)

This repository contains the Phase 1 backend foundation.

See `docs/` for architecture, API contracts, and setup instructions.

## Docker and Ports
- Backend API is exposed on `http://localhost:8001`
- PostgreSQL database is exposed on `localhost:5433`

To start the database:
```bash
docker compose up -d db
```

To run the full stack:
```bash
docker compose up -d
```
