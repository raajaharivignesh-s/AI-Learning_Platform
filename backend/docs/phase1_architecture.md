# Phase 1 Architecture

## Overview
This backend implements a scalable, modular foundation using FastAPI and SQLAlchemy.

## Layers
- **API (app/api)**: Route definitions, thin handlers that validate inputs and return schemas.
- **Services (app/services)**: Business logic, database interactions.
- **Data (app/models & app/db)**: SQLAlchemy models and database connection management.
- **Schemas (app/schemas)**: Pydantic models for request and response validation.

## Authentication
JWT-based authentication using Argon2 for password hashing.
