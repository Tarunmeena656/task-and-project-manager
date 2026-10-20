# Task Manager

A small project and task management app: register, log in, create projects, and manage the tasks inside them with server-side search, filtering, sorting and pagination.

- **Live app:** https://task-manager-3x22.onrender.com
- **Live API:** https://task-manager-3x22.onrender.com/api (try `/api/health`)
- **Demo login:** `demo@example.com` / `demo1234`

## Stack

| Layer | Tech |
|---|---|
| Frontend | Angular 21 (standalone components, signals, Reactive Forms, Router, HttpClient), Angular Material |
| Backend | Node.js, TypeScript, Express 4, Zod validation, JWT (jsonwebtoken), bcryptjs |
| Database | PostgreSQL with Prisma (schema + migrations) |
| Tests | Vitest + Supertest (backend), Vitest + Angular TestBed (frontend) |

## Architecture

```
frontend/  Angular SPA
  src/app/core      AuthService (token + user in localStorage, signals), auth interceptor
                    (adds Bearer, handles 401), authGuard, ApiService, models
  src/app/pages     login, register, dashboard, project (task list)
  src/app/shared    project / task / confirm dialogs

backend/   Express REST API
  src/routes        auth, dashboard, projects, tasks
  src/middleware    requireAuth (JWT), validate (Zod), error handler
  prisma/           schema.prisma, migrations/, seed.ts
  tests/            API tests (run against a real Postgres test database)
```

Request flow: Angular → `/api/*` → Express router → Zod validation → Prisma → PostgreSQL. The API is stateless; the JWT carries the user id, and every project/task query is scoped to that user, so other users' data returns 404.

In production the Express app also serves the built Angular bundle (`STATIC_DIR`), so one service hosts both the UI and the API on the same origin.

### Database schema

```
User     id (uuid pk), name, email (unique), passwordHash, createdAt
Project  id (uuid pk), name, description, status ACTIVE|COMPLETED|ARCHIVED, createdAt, updatedAt,
         userId -> User (cascade delete)        index (userId, createdAt)
Task     id (uuid pk), title, description, status TODO|IN_PROGRESS|DONE, priority LOW|MEDIUM|HIGH,
         dueDate (date, nullable), createdAt, updatedAt,
         projectId -> Project (cascade delete)  indexes (projectId, createdAt), (projectId, status), (projectId, dueDate)
```

Statuses and priorities are Postgres enums. `TaskPriority` is declared `LOW, MEDIUM, HIGH` so `ORDER BY priority` sorts by importance, not alphabetically.

## Local setup

Requirements: Node 22.12+ (Angular 21 needs 22.22+ or 24+), PostgreSQL 14+.

```bash
# database
createdb taskmanager
createdb taskmanager_test        # only needed for the backend tests

# backend
cd backend
cp .env.example .env             # edit DATABASE_URL and JWT_SECRET
npm install                      # also runs prisma generate
npx prisma migrate deploy        # creates the tables
npm run db:seed                  # optional: demo user + sample projects
npm run dev                      # http://localhost:3000

# frontend (second terminal)
cd frontend
npm install
npm start                        # http://localhost:4200, proxies nothing: it calls http://localhost:3000/api directly
```

### Environment variables (backend)

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `DATABASE_URL` | Postgres connection string | required |
| `JWT_SECRET` | secret for signing tokens | required |
| `JWT_EXPIRES_IN` | token lifetime | `1d` |
| `CORS_ORIGIN` | comma-separated allowed origins | `*` |
| `STATIC_DIR` | path to the built frontend; when set the API also serves the SPA | unset |

The frontend has no runtime env vars. `src/environments/environment.development.ts` points at `http://localhost:3000/api` for `ng serve`; the production build uses `/api` (same origin).

## API

All endpoints are under `/api`. Protected endpoints need `Authorization: Bearer <token>`. Errors are JSON: `{ "message": "...", "errors": [{ "field", "message" }] }` with 400 (validation), 401 (missing/invalid/expired token or bad credentials), 404 (not found or not yours), 409 (duplicate email), 500.

| Method | Endpoint | Body / query | Response |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password (min 8) }` | 201 `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` |
| POST | `/auth/logout` | | 204 |
| GET | `/auth/me` | | `user` |
| GET | `/dashboard` | | `{ projects, totalProjects, totalTasks, pendingTasks, completedTasks }` |
| GET | `/projects` | | `Project[]` (each with `_count.tasks`) |
| POST | `/projects` | `{ name, description?, status? }` | 201 `Project` |
| GET / PUT / DELETE | `/projects/:id` | PUT: same as POST | `Project` / 204 |
| GET | `/projects/:id/tasks` | see below | `{ items, total, page, pageSize }` |
| POST | `/projects/:id/tasks` | `{ title, description?, status?, priority?, dueDate? (YYYY-MM-DD) }` | 201 `Task` |
| GET / PUT / DELETE | `/tasks/:id` | PUT: same as POST | `Task` / 204 |

Task list query parameters: `search` (title, case-insensitive), `status`, `priority`, `dueFrom`, `dueTo` (YYYY-MM-DD), `sort` = `createdAt` | `dueDate` | `priority`, `order` = `asc` | `desc`, `page` (1-based), `pageSize` (max 100). Filtering, sorting and paging all happen in SQL.

Example:

```bash
curl -X POST http://localhost:3000/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"demo@example.com","password":"demo1234"}'

curl "http://localhost:3000/api/projects/<id>/tasks?status=TODO&sort=priority&order=desc&page=1&pageSize=5" \
  -H "authorization: Bearer <token>"
```

## Tests

```bash
cd backend && npm test        # 14 tests: register/login/token handling, project CRUD + ownership,
                              # task CRUD, search/filter/sort/pagination, dashboard counts
cd frontend && npm test       # 5 tests: AuthService login/logout, authGuard
```

The backend tests use `.env.test` (`DATABASE_URL` for `taskmanager_test`), apply the migrations once, and wipe the tables before each test.

## Deployment

`render.yaml` is a Render Blueprint that creates a free Postgres database and one web service which builds the frontend, builds the backend, runs migrations and the seed on start, and serves both the SPA and the API.

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo, click Apply.
3. The service URL is both the frontend and the API base (`<url>/api`).

Current deployment: https://task-manager-3x22.onrender.com (Render, Oregon, free plan) with the `task-manager-db` Postgres instance.

`JWT_SECRET` is generated by Render; `DATABASE_URL` is wired from the database.

## Assumptions and known limitations

- Logout is stateless: the server has no token blacklist, the client discards the token (tokens expire after `JWT_EXPIRES_IN`). A refresh-token flow was out of scope.
- Project status is not derived from tasks; the user sets it.
- Due dates are stored as dates (no time, no timezone) and displayed in UTC to avoid off-by-one shifts.
- Render's free tier spins the service down after inactivity (first request can take ~30 s) and the free Postgres expires after 30 days.
- No rate limiting or email verification.
