# PulseGuard Project Overview (Full)

Last updated: 2026-03-04

## 1. What This Project Is
PulseGuard is a multi-tenant API monitoring SaaS MVP for learning and local development.

Core goal:
- Add API endpoints as monitors per workspace.
- Run checks continuously.
- Detect incidents from repeated failures.
- Notify on incident open/resolve.
- Visualize health and reliability in dashboard views.

## 2. Current Stack

### Backend
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- BullMQ + Redis for check queue and worker
- Nodemailer (log/smtp modes)

### Frontend
- Next.js App Router + React + TypeScript
- Tailwind + custom UI components
- Recharts for dashboard charts
- Framer Motion for UI transitions

### Infrastructure / Local
- Docker Compose services:
  - `postgres` (port `5433`)
  - `redis` (port `6380`)
  - `api` (port `4000`)
  - `worker`

## 3. Data Model (Prisma)
Main entities:
- `User`
- `Workspace`
- `WorkspaceMember` (`OWNER|ADMIN|VIEWER`)
- `Monitor`
- `MonitorCheck`
- `Incident`
- `IncidentEvent`
- `Notification`
- Auth/session tables: `RefreshSession`, `PasswordResetToken`

## 4. Backend Modules and Routes

### Health + Admin
- `GET /health`
- `GET /ready`
- `GET /api/admin/queue-stats`
- `POST /api/admin/run-checks`

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`

### Workspaces
- `GET /api/workspaces`
- `POST /api/workspaces`

### Monitors
- `GET /api/workspaces/:id/monitors`
- `POST /api/workspaces/:id/monitors`
- `PUT /api/workspaces/:id/monitors/:monitorId`
- `DELETE /api/workspaces/:id/monitors/:monitorId`
- `GET /api/workspaces/:id/monitors/:monitorId/checks`
- `POST /api/workspaces/:id/monitors/:monitorId/run-check`

### Incidents
- `GET /api/workspaces/:id/incidents`
- `GET /api/workspaces/:id/incidents/:incidentId`

### Notifications
- `GET /api/workspaces/:id/notifications`

### Alerts
- `GET /api/workspaces/:id/alerts`
- `PUT /api/workspaces/:id/alerts`

### Dashboard Analytics
- `GET /api/workspaces/:id/dashboard/analytics?range=1h|24h|7d|30d`

## 5. Monitoring / Incident Logic
- Worker checks monitors on interval.
- Each monitor has `intervalSeconds` and `timeoutMs`.
- Incident opens after `3` consecutive failures.
- Incident resolves after `2` consecutive successes.
- Notifications are emitted for:
  - `INCIDENT_OPENED`
  - `INCIDENT_RESOLVED`
- Check history retention cleanup is implemented.

## 6. Frontend Pages

### Public/Auth
- `/` landing page
- `/login`
- `/signup`
- `/workspaces`
- `/account`
- `/admin`

### Workspace-scoped
- `/w/[workspaceId]/dashboard`
- `/w/[workspaceId]/monitors`
- `/w/[workspaceId]/monitors/new`
- `/w/[workspaceId]/monitors/[monitorId]`
- `/w/[workspaceId]/incidents`
- `/w/[workspaceId]/incidents/[incidentId]`
- `/w/[workspaceId]/notifications`
- `/w/[workspaceId]/settings`
- `/w/[workspaceId]/settings/alerts`
- `/w/[workspaceId]/settings/team`

## 7. What Is Already Working
- Workspace creation + workspace switching
- Monitor CRUD
- Pause/resume monitor
- Per-monitor interval configuration (`intervalSeconds`)
- Manual check trigger
- Automatic check scheduling
- Dashboard connected to backend analytics endpoint
- Incident open/resolve lifecycle
- Email + slack notification persistence/dispatch logic
- Docker local run for API + worker + DB + Redis

## 8. Current Known Gaps / Next Steps
- Team management API and full UI wiring (member invite/role updates/remove)
- Full production auth hardening + OAuth finalization
- Broader E2E automation across complete frontend flows
- Deployment/ops hardening (CI/CD, env separation, observability)

## 9. Key Environment Variables
- `PORT`, `NODE_ENV`
- `DATABASE_URL`, `DIRECT_URL`
- `REDIS_URL`
- `DEV_AUTH_BYPASS`, `DEV_USER_EMAIL`, `DEV_USER_NAME`
- `CHECK_INTERVAL_SECONDS`, `SCHEDULER_TICK_SECONDS`, `WORKER_CONCURRENCY`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `EMAIL_TRANSPORT`, `SMTP_*`, `EMAIL_FROM`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

## 10. Run / Validate

### Start stack
```bash
docker compose up -d
```

### Backend tests
```bash
npm test
```

### Frontend dev
```bash
cd frontend
npm run dev
```

### Health checks
```bash
curl -s http://localhost:4000/health
curl -s http://localhost:4000/ready
```

## 11. Files to Know First
- Backend entry: `src/app.ts`, `src/server.ts`, `src/worker.ts`
- Scheduler/check engine: `src/jobs/monitor-engine.ts`
- Dashboard analytics route: `src/modules/workspaces/dashboard.routes.ts`
- Frontend API client: `frontend/src/lib/api.ts`
- Workspace dashboard UI: `frontend/src/app/w/[workspaceId]/dashboard/page.tsx`
