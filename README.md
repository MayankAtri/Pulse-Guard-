# PulseGuard - Team API Monitor (Backend MVP)

Backend-first SaaS learning project for multi-tenant API monitoring.

## Implemented Feature Phases

### Phase 1 - Foundation
- Express + TypeScript app and worker entrypoints
- Docker Compose for API, worker, Postgres, Redis
- Prisma schema with UUID-based entities
- Health endpoints: `/health`, `/ready`

### Phase 2 - Auth and Workspace Core
- Email/password signup and login
- Google Sign-In via ID token verification
- Auto-link Google account by email
- Access + refresh tokens in `httpOnly` cookies
- Single active refresh session per user
- Login lockout: 5 failed attempts, 15 minutes
- Password reset (request/confirm)
- Auto-create default workspace on new account

### Phase 3 - Multi-Tenant and RBAC
- Workspace membership checks on workspace-scoped routes
- Role middleware for OWNER/ADMIN/VIEWER
- Owner/admin monitor management
- Per-monitor edit ownership rules (creator/admin/owner)

### Phase 4 - Monitoring and Incident Engine
- BullMQ worker processing monitor checks
- Fixed 60-second monitor scheduling
- GET checks with timeout + status + keyword validation
- Failure classification (timeout, DNS, connection, HTTP, keyword mismatch)
- Incident open after 3 consecutive failures
- Incident resolve after 2 consecutive successes
- Incident event timeline (`OPENED`, `RESOLVED`)
- Soft delete for monitors
- 30-day retention cleanup for monitor checks

### Phase 5 - Local Dev Tooling
- Seed script for local owner/workspace/monitor
- Default seeded real monitor target: `https://heal-net.onrender.com/health`
- Mock health target endpoint for incident simulation
- Postman collection + local environment file
- Unit + integration test suite scaffold
- Queue stats endpoint: `/api/admin/queue-stats`
- Manual check trigger endpoint: `POST /api/admin/run-checks`

### Phase 6 - Email Alerts
- Notification records stored in database (`notifications`)
- Alert dispatch on incident state changes only:
  - `INCIDENT_OPENED`
  - `INCIDENT_RESOLVED`
- Idempotent notification delivery per incident/type
- Email transport modes:
  - `EMAIL_TRANSPORT=log` (default, local testing)
  - `EMAIL_TRANSPORT=smtp` (real email delivery)

## Run Locally

1. Copy env file:
```bash
cp .env.example .env
```

2. Start stack:
```bash
docker compose up --build
```

3. API base URL:
- `http://localhost:4000`

## Credentials
- No default seeded user is created on startup.
- Create your account from `/signup` or use Google sign-in.

## Useful Endpoints
- `GET /health`
- `GET /ready`
- `GET /api/workspaces`
- `POST /api/workspaces/:id/monitors`
- `POST /api/workspaces/:id/monitors/:monitorId/run-check`
- `GET /api/workspaces/:id/monitors/:monitorId/checks?limit=20`
- `GET /api/workspaces/:id/incidents`
- `GET /api/workspaces/:id/notifications`
- `GET /api/admin/queue-stats`
- `POST /api/admin/run-checks`

## Testing

```bash
npm test
```

### Phase E2E

```bash
npm run test:e2e:phase5
```

Optional flags:
- `BOOT_STACK=0` to run against an already running stack.
- `KEEP_STACK=1` to keep containers up after test completion.
- `BASE_URL=http://localhost:4000` to target a custom API URL.

### Auth E2E

```bash
npm run test:e2e:auth
```

This test starts the stack with `DEV_AUTH_BYPASS=false` and validates cookie-based auth flows.

### Email E2E

```bash
npm run test:e2e:email
```

This test forces incident open/resolve and verifies `INCIDENT_OPENED` + `INCIDENT_RESOLVED` notification records.

## Notes
- Keep `DEV_AUTH_BYPASS=false` for proper account/workspace isolation.
- If you intentionally enable `DEV_AUTH_BYPASS=true`, requests can be forced to a specific dev identity using headers:
  `x-dev-user-email`, `x-dev-user-name`.
- Billing remains deferred.
- API versioning is intentionally deferred (`/api/v1` not used in MVP).
- Validation is minimal by design for this phase.
