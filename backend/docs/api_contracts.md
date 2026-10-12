# API Contracts

## Health
- `GET /api/v1/health`: Returns 200 `{"status": "ok"}`
- `GET /api/v1/health/ready`: Returns 200 `{"status": "ready"}` or 503 if DB is down.

## Auth
- `POST /api/v1/auth/register`: Expects email, password, full_name. Returns 201 User.
- `POST /api/v1/auth/login`: Expects email, password. Returns 200 Token.
- `GET /api/v1/auth/me`: Requires Bearer Token. Returns 200 User.

## Courses
- `POST /api/v1/courses`: Requires Bearer Token. Returns 201 Course.
- `GET /api/v1/courses`: Requires Bearer Token. Returns 200 Paginated Courses.
- `GET /api/v1/courses/{course_id}`: Requires Bearer Token. Returns 200 Course.
- `PATCH /api/v1/courses/{course_id}`: Requires Bearer Token. Returns 200 Course.
- `DELETE /api/v1/courses/{course_id}`: Requires Bearer Token. Returns 204.
