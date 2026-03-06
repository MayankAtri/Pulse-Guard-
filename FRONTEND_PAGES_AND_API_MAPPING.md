# PulseGuard Frontend Pages and Backend Mapping

## 1) Frontend Pages to Build

Build these pages first, in this order:

1. `Auth - Login / Signup`
2. `Workspace Selector`
3. `Dashboard (Monitors Overview)`
4. `Create Monitor`
5. `Monitor Detail (Checks + Actions)`
6. `Incidents List`
7. `Incident Detail`
8. `Notifications Feed`
9. `Alert Settings (Slack)`
10. `Account Settings (Profile + Logout + Password Reset)`
11. `Admin/Debug (optional for local MVP)`

---

## 2) Backend Base Rules for Frontend

- Base URL: `http://localhost:4000`
- All app APIs are under `/api/...`
- Auth is cookie-based (`access_token`, `refresh_token`) when auth is enabled.
- For local development with bypass (`DEV_AUTH_BYPASS=true`), include optional headers:
  - `x-dev-user-email`
  - `x-dev-user-name`
- Use `credentials: "include"` in frontend fetch/axios calls.
- Workspace-scoped routes require `:id` (workspaceId) in path.
- Common error responses:
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not found`
  - `409 Conflict` (example: paused monitor run-check)

---

## 3) Page-by-Page API Wiring

## Auth - Login / Signup

### UI actions and API

- `Sign up form submit`
  - `POST /api/auth/signup`
  - Body:
    ```json
    { "email": "user@example.com", "password": "Passw0rd!", "name": "User Name" }
    ```
  - Success: `201 { user }`
  - Frontend: store `user` in app state, redirect to Workspace Selector.

- `Login form submit`
  - `POST /api/auth/login`
  - Body:
    ```json
    { "email": "user@example.com", "password": "Passw0rd!" }
    ```
  - Success: `200 { user }`
  - Frontend: set user state, redirect to Workspace Selector.

- `Google sign-in`
  - `POST /api/auth/google`
  - Body:
    ```json
    { "idToken": "<google-id-token>" }
    ```
  - Success: `200 { user }`

- `Session refresh` (silent)
  - `POST /api/auth/refresh`
  - Body: none
  - Success: `200 { ok: true }`

- `Current user`
  - `GET /api/auth/me`
  - Success: `200 { user }`
  - Use this in app bootstrap.

---

## Workspace Selector

### UI actions and API

- `Load workspaces`
  - `GET /api/workspaces`
  - Success:
    ```json
    {
      "workspaces": [
        { "id": "...", "name": "...", "role": "OWNER|ADMIN|VIEWER", "joinedAt": "..." }
      ]
    }
    ```

- `Create workspace`
  - `POST /api/workspaces`
  - Body:
    ```json
    { "name": "My Workspace" }
    ```
  - Success: `201 { workspace }`

Frontend note:
- Save selected `workspaceId` in route state or local storage.

---

## Dashboard (Monitors Overview)

Route suggestion: `/w/:workspaceId/dashboard`

### UI actions and API

- `Load monitors`
  - `GET /api/workspaces/:id/monitors`
  - Success: `200 { monitors: [...] }`

- `Run all active monitor checks` (manual refresh button)
  - `POST /api/admin/run-checks`
  - Body:
    ```json
    { "workspaceId": "<workspaceId>" }
    ```
  - Success: `200 { queue, enqueued, filter }`

- `Queue status widget` (optional on dashboard)
  - `GET /api/admin/queue-stats`
  - Success: `{ waiting, active, delayed, failed, completed }`

Frontend cards per monitor should show:
- name, url
- `isPaused`
- `expectedStatus`
- `expectedKeyword`
- last known status using latest check from monitor detail endpoint or incident status summary.

---

## Create Monitor

Route suggestion: `/w/:workspaceId/monitors/new`

### UI actions and API

- `Create monitor submit`
  - `POST /api/workspaces/:id/monitors`
  - Body:
    ```json
    {
      "name": "HealNet Health",
      "url": "https://heal-net.onrender.com/health",
      "expectedStatus": 200,
      "expectedKeyword": "ok",
      "timeoutMs": 5000
    }
    ```
  - Success: `201 { monitor }`

Validation rules from backend:
- `name`: 1..120
- `url`: valid URL
- `expectedStatus`: 100..599
- `expectedKeyword`: optional, 1..1000 if present
- `timeoutMs`: 100..30000

Role rule:
- Only `OWNER` or `ADMIN` can create.

---

## Monitor Detail (Checks + Actions)

Route suggestion: `/w/:workspaceId/monitors/:monitorId`

### UI actions and API

- `Load monitor list then pick one`
  - `GET /api/workspaces/:id/monitors`
  - Filter on frontend by `monitorId`.

- `Load recent checks`
  - `GET /api/workspaces/:id/monitors/:monitorId/checks?limit=20`
  - Success: `200 { checks: [...] }`

- `Update monitor`
  - `PUT /api/workspaces/:id/monitors/:monitorId`
  - Body (partial):
    ```json
    { "name": "New name", "expectedStatus": 200, "expectedKeyword": "up", "timeoutMs": 5000, "isPaused": false }
    ```
  - Success: `200 { monitor }`

- `Pause / Resume`
  - Same `PUT` endpoint with `{ "isPaused": true|false }`

- `Run check now`
  - `POST /api/workspaces/:id/monitors/:monitorId/run-check`
  - Success: `202 { queued: true, jobId, monitorId }`
  - Conflict: `409 { error: "Monitor is paused" }`

- `Delete monitor (soft delete)`
  - `DELETE /api/workspaces/:id/monitors/:monitorId`
  - Success: `204`

Role rule:
- `OWNER/ADMIN`: can view/edit all
- `VIEWER`: can only view/edit own created monitors

---

## Incidents List

Route suggestion: `/w/:workspaceId/incidents`

### UI actions and API

- `Load incidents`
  - `GET /api/workspaces/:id/incidents`
  - Success:
    ```json
    { "incidents": [{ "id": "...", "status": "OPEN|RESOLVED", "monitor": { "id": "...", "name": "...", "url": "..." }, ... }] }
    ```

Frontend filters:
- status (`OPEN`, `RESOLVED`)
- monitor
- date range (frontend-side initially for MVP)

---

## Incident Detail

Route suggestion: `/w/:workspaceId/incidents/:incidentId`

### UI actions and API

- `Load incident detail`
  - `GET /api/workspaces/:id/incidents/:incidentId`
  - Success:
    ```json
    {
      "incident": {
        "id": "...",
        "status": "OPEN|RESOLVED",
        "events": [{ "type": "OPENED|RESOLVED", "details": "...", "createdAt": "..." }],
        "monitor": { "id": "...", "name": "...", "url": "..." }
      }
    }
    ```

UI sections:
- incident summary
- timeline/events
- linked monitor quick actions

---

## Notifications Feed

Route suggestion: `/w/:workspaceId/notifications`

### UI actions and API

- `Load notifications`
  - `GET /api/workspaces/:id/notifications`
  - Success: `200 { notifications: [...] }` (max 100)

Show fields:
- `type` (`INCIDENT_OPENED`, `INCIDENT_RESOLVED`)
- `channel` (`EMAIL`, `SLACK`)
- `status` (`SENT`, `FAILED`)
- `sentAt`
- `error` (if failed)
- link to incident

---

## Alert Settings (Slack)

Route suggestion: `/w/:workspaceId/settings/alerts`

### UI actions and API

- `Load alert settings`
  - `GET /api/workspaces/:id/alerts`
  - Success:
    ```json
    { "alerts": { "id": "...", "slackEnabled": true, "slackWebhookUrl": "https://..." } }
    ```

- `Update alert settings`
  - `PUT /api/workspaces/:id/alerts`
  - Body examples:
    ```json
    { "slackEnabled": true, "slackWebhookUrl": "https://hooks.slack.com/services/..." }
    ```
    ```json
    { "slackEnabled": false }
    ```
    ```json
    { "slackWebhookUrl": null }
    ```
  - Success: `200 { alerts }`

Role rule:
- Only `OWNER` or `ADMIN` can update.

---

## Account Settings (Profile + Password Reset + Logout)

Route suggestion: `/account`

### UI actions and API

- `Load profile`
  - `GET /api/auth/me`

- `Request password reset`
  - `POST /api/auth/password-reset/request`
  - Body:
    ```json
    { "email": "user@example.com" }
    ```
  - Success: `202 { ok: true, resetTokenForLocalDev?: "..." }`

- `Confirm password reset`
  - `POST /api/auth/password-reset/confirm`
  - Body:
    ```json
    { "token": "<token>", "newPassword": "NewPassw0rd!" }
    ```
  - Success: `204`

- `Logout`
  - `POST /api/auth/logout`
  - Success: `204`

---

## Admin/Debug Page (Optional Local MVP)

Route suggestion: `/admin`

Use only for local/testing, hide behind feature flag.

### UI actions and API

- `Queue stats`
  - `GET /api/admin/queue-stats`

- `Run checks`
  - `POST /api/admin/run-checks`
  - Body options:
    - `{}` run all active
    - `{ "workspaceId": "..." }`
    - `{ "workspaceId": "...", "monitorId": "..." }`

- `Mock health toggle` (local testing only)
  - `POST /mock/toggle`
  - Body:
    ```json
    { "healthy": false, "body": "forced down" }
    ```

---

## 4) Suggested Frontend Route Map

- `/login`
- `/signup`
- `/auth/callback` (for Google)
- `/workspaces`
- `/w/:workspaceId/dashboard`
- `/w/:workspaceId/monitors/new`
- `/w/:workspaceId/monitors/:monitorId`
- `/w/:workspaceId/incidents`
- `/w/:workspaceId/incidents/:incidentId`
- `/w/:workspaceId/notifications`
- `/w/:workspaceId/settings/alerts`
- `/account`
- `/admin` (optional)

---

## 5) Shared Frontend Service Layer (recommended)

Create one API client module with:

- `authApi`: `signup`, `login`, `googleLogin`, `refresh`, `me`, `logout`, `requestReset`, `confirmReset`
- `workspaceApi`: `listWorkspaces`, `createWorkspace`
- `monitorApi`: `listMonitors`, `createMonitor`, `updateMonitor`, `deleteMonitor`, `runCheck`, `listChecks`
- `incidentApi`: `listIncidents`, `getIncident`
- `notificationApi`: `listNotifications`
- `alertsApi`: `getAlerts`, `updateAlerts`
- `adminApi`: `queueStats`, `runChecks`

Implementation notes:
- Always pass `credentials: "include"`.
- Add a response interceptor: on `401`, call `/api/auth/refresh` once, then retry original request.
- Centralize toast/error handling for `403`, `404`, `409`, validation failures.

---

## 6) MVP Build Order (to reduce debugging)

1. Auth page + `GET /api/auth/me` bootstrap
2. Workspace selector
3. Monitors list + create
4. Monitor detail + run-check + checks history
5. Incidents list/detail
6. Notifications feed
7. Slack alert settings
8. Optional admin/debug page

This order matches backend dependencies and minimizes integration churn.

---

## 7) Frontend Tech Needed (Recommended Stack)

Use this stack for fast MVP delivery with low debugging overhead:

1. Framework: `Next.js 15` + `React` + `TypeScript`
- Why: file-based routing, strong DX, good for SaaS dashboards, easy future SSR/SEO if needed.

2. Styling/UI: `Tailwind CSS` + `shadcn/ui`
- Why: fast component building, consistent design system, easy customization without fighting UI libraries.

3. Data Fetching/Cache: `TanStack Query`
- Why: handles retries, caching, refetch intervals, loading/error state, and optimistic updates cleanly.

4. HTTP Client: `fetch` (or `axios`) with shared API wrapper
- Why: centralize `baseURL`, `credentials: "include"`, error parsing, and auth-refresh retry logic.

5. Forms and Validation: `React Hook Form` + `Zod`
- Why: matches backend zod-style validation and reduces invalid payload bugs.

6. State Management: minimal global state (`Zustand` optional)
- Why: most state should stay in query cache; keep global state only for `session user`, `active workspace`, and UI toggles.

7. Tables/Charts:
- `TanStack Table` for monitors/incidents/notifications tables
- `Recharts` for uptime trend and response-time charts

8. Date/Time Helpers: `date-fns`
- Why: robust formatting for incident durations, check timestamps, relative times.

9. Notifications: `sonner` (or `react-hot-toast`)
- Why: standardized success/error toasts for API actions.

10. Icons: `lucide-react`
- Why: clean, consistent icon set with tree-shaking.

11. Testing:
- Unit/component: `Vitest` + `React Testing Library`
- E2E: `Playwright`
- Why: validates critical flows (auth, monitor create, run-check, incidents, alert settings).

12. Quality/Tooling:
- `ESLint` + `Prettier`
- `Husky` + `lint-staged` (optional)
- Why: catches mistakes early and keeps code consistent.

13. Environment setup:
- `.env.local` with:
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`
- Ensure API calls always send cookies:
  - `credentials: "include"`

14. Auth behavior needed in frontend:
- On app load: call `GET /api/auth/me`
- If `401`: try `POST /api/auth/refresh` once, then retry original request
- If refresh fails: redirect to `/login`

15. Suggested folder structure:
- `src/app` (routes/pages)
- `src/components` (UI components)
- `src/features` (monitor/incidents/auth modules)
- `src/lib/api` (http client + endpoint functions)
- `src/lib/auth` (session bootstrap + guards)
- `src/types` (API response/request types)

---

## 8) Minimal Install List

Core install set (if using Next.js):

- `next react react-dom typescript`
- `tailwindcss postcss autoprefixer`
- `@tanstack/react-query`
- `react-hook-form zod @hookform/resolvers`
- `date-fns`
- `lucide-react`
- `sonner`
- `@tanstack/react-table`
- `recharts`

Testing:
- `vitest @testing-library/react @testing-library/jest-dom jsdom`
- `playwright`

---

## 9) Dashboard Enhancements (What More Should Be On Dashboard)

- Uptime % by monitor: 24h, 7d, 30d chips so weak services are visible quickly.
- Open incidents panel: severity, start time, impacted monitor, and quick inspect action.
- Recent checks stream: latest checks across monitors with status, latency, and error type.
- Error breakdown widget: grouped by `TIMEOUT`, `HTTP_5XX`, `KEYWORD_MISMATCH`, etc.
- Latency percentiles: show p50/p95/p99 (not only average).
- MTTR / MTTD cards: mean time to resolve and mean time to detect.
- Alert delivery health: sent vs failed grouped by channel (`EMAIL`, `SLACK`).
- Queue/worker health: waiting, active, delayed, failed, completed jobs.
- Monitor coverage: active vs paused counts and ownership.
- Flapping detector: monitors that changed up/down repeatedly in last 24h.
- SLO burn view: error-budget usage trend for critical monitors.
- Quick actions row: run all checks, create monitor, open incidents, open alerts.
- Filters: workspace, monitor status, owner, environment, tags.
- Global time range switcher: `1h / 24h / 7d / 30d` applied to all dashboard widgets.
- Needs-attention block: top monitors with rising failures or latency spikes.
