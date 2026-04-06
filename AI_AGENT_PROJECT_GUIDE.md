# PulseGuard Agent Guide

## What This Project Is

PulseGuard is a multi-tenant API monitoring platform for teams. Users can create accounts, create workspaces, add monitors for external APIs, run manual or scheduled checks, detect outages, open and resolve incidents, and notify workspace members through email and Slack. The project is built as a backend API plus worker with a separate Next.js frontend.

## Core Product Areas

- Auth: email/password login, Google sign-in, logout, password reset
- Workspaces: each user operates inside isolated workspaces
- Team management: owner/admin/viewer roles with RBAC
- Monitors: create, update, pause, resume, delete, and manually run checks
- Scheduler and worker: automatic execution of due monitor checks
- Incidents: open after repeated failures, resolve after repeated successes
- Notifications: email and Slack alert dispatch on incident state changes
- Dashboard: analytics, recent checks, incident trends, alert delivery, monitor health

## Tech Stack

- Backend: Node.js, Express, TypeScript
- Frontend: Next.js
- Database: PostgreSQL
- Queue and scheduler: Redis + BullMQ worker
- ORM: Prisma
- Email: Nodemailer SMTP transport
- Containers: Docker Compose for local Postgres and Redis

## What The Project Needs To Run

### Required Services

- PostgreSQL
- Redis
- Backend API process
- Worker process
- Frontend process

### Local Runtime Expectations

- Docker Desktop running for local Postgres and Redis
- Node.js and npm installed
- Root `.env` file present for backend and worker configuration
- Frontend environment configured to point at the backend API

## Main Local Ports

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000`
- Postgres: `localhost:5433`
- Redis: `localhost:6380`

## Important Runtime Behavior

- The API does not execute monitor checks directly. It enqueues jobs.
- The worker consumes queued jobs and also schedules automatic checks.
- If executions stay in `queued`, the worker is usually not running.
- If a monitor says `Monitor is paused`, manual execution is blocked until resumed.
- Automatic checks only run when the monitor is not paused and its interval has elapsed.

## Environment Requirements

The backend uses these categories of env vars:

- Database: `DATABASE_URL`, `DIRECT_URL`
- Redis: `REDIS_URL`
- Auth: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Email: `EMAIL_TRANSPORT`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- Runtime: `PORT`, `NODE_ENV`, `SCHEDULER_TICK_SECONDS`, `CHECK_INTERVAL_SECONDS`

The frontend uses:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

## Standard Local Startup

### Infrastructure

```bash
docker compose up -d postgres redis
```

### Frontend

```bash
cd frontend
npm run dev
```

### API

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/pulseguard \
DIRECT_URL=postgresql://postgres:postgres@localhost:5433/pulseguard \
REDIS_URL=redis://localhost:6380 \
DEV_AUTH_BYPASS=false \
npm run start:api
```

### Worker

```bash
docker compose up -d worker
```

## Health Checks

- API health: `GET /health`
- API readiness: `GET /ready`
- Queue stats: `GET /api/admin/queue-stats`

If `GET /ready` fails, check Postgres and Redis first.

## Where To Look First In The Codebase

- Backend entry: [`src/app.ts`](/Users/mayankatri/Projects/PulseGuard/src/app.ts)
- Worker entry: [`src/worker.ts`](/Users/mayankatri/Projects/PulseGuard/src/worker.ts)
- Monitor engine: [`src/jobs/monitor-engine.ts`](/Users/mayankatri/Projects/PulseGuard/src/jobs/monitor-engine.ts)
- Notification dispatch: [`src/jobs/notifications.ts`](/Users/mayankatri/Projects/PulseGuard/src/jobs/notifications.ts)
- Env parsing: [`src/config/env.ts`](/Users/mayankatri/Projects/PulseGuard/src/config/env.ts)
- Frontend API client: [`frontend/src/lib/api.ts`](/Users/mayankatri/Projects/PulseGuard/frontend/src/lib/api.ts)

## Known Operational Notes

- Docker is used locally for Postgres and Redis, not because the app requires full containerized development.
- The worker must be running for scheduled checks and queued manual checks.
- SMTP is configured for incident emails, but password reset mail delivery is not fully wired to send real emails yet.
- The project has been smoke-tested end-to-end for auth, RBAC, monitor creation, incident open, and incident resolve flows.
