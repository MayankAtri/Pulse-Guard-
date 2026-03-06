# Production Checklist

## 1) Required Environment Variables
Set these in your deployment platform (do not commit secrets):

- `NODE_ENV=production`
- `PORT` (platform default is usually fine)
- `DATABASE_URL`
- `DIRECT_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET` (strong random string)
- `JWT_REFRESH_SECRET` (strong random string)
- `ACCESS_TOKEN_TTL_MIN` (recommended: `15`)
- `REFRESH_TOKEN_TTL_DAYS` (recommended: `7`)
- `COOKIE_DOMAIN` (your root domain, e.g. `.yourdomain.com`)
- `CORS_ORIGINS` (comma-separated allowed frontend origins)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (must match Google Console)
- `EMAIL_TRANSPORT=smtp`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `DEV_AUTH_BYPASS=false`
- `WORKER_CONCURRENCY`
- `SCHEDULER_TICK_SECONDS`
- `CHECK_INTERVAL_SECONDS`
- `BCRYPT_ROUNDS`
- `LOG_LEVEL`

## 2) Must-Be-True Security Settings
- `DEV_AUTH_BYPASS=false`
- No demo seed at startup (`ENABLE_DEMO_SEED` unset or not `true`)
- HTTPS enabled
- Cookies are secure in production
- CORS allows only real frontend origin(s)

## 3) Pre-Push Local Verification
Run from repo root:

```bash
npm run build
npm test
cd frontend && npm run lint && npm run build && cd ..
BOOT_STACK=1 KEEP_STACK=0 npm run test:e2e:smoke
```

## 4) Deploy Order
1. Apply environment variables
2. Deploy API
3. Deploy worker
4. Deploy frontend

## 5) Post-Deploy Smoke Checks
- API health:
  - `GET /health` -> `200`
  - `GET /ready` -> `200`
- Auth:
  - Signup
  - Login
  - Logout
- Workspaces:
  - Create workspace
  - List only own memberships
- Team RBAC:
  - OWNER/ADMIN can add members
  - VIEWER cannot add/update/remove members
- Monitoring:
  - Create monitor
  - Pause/resume monitor
  - Run check now
- Incidents:
  - Open after 3 consecutive failures
  - Resolve after 2 consecutive successes
- Notifications:
  - Incident opened/resolved records created
  - Email/Slack delivery status visible

## 6) Failure Rollback Plan
If deployment is unstable:
1. Roll frontend to previous known-good build
2. Roll API/worker to previous known-good image
3. Keep DB schema unchanged unless migration was verified
4. Re-run `/health` + `/ready` and smoke checks

## 7) GitHub Actions Workflows Included
- `.github/workflows/ci.yml`
- `.github/workflows/e2e-smoke.yml`

Use CI green status + smoke pass as your release gate.
