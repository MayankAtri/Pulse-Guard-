# Team API Monitor SaaS – Complete Technical Specification

## 1. Project Overview

### Product Name
Team API Monitor

### Product Type
Multi-tenant SaaS platform for API uptime monitoring, incident tracking, team collaboration, and subscription-based billing.

### Core Purpose
Provide teams with automated monitoring of their APIs and endpoints, detect failures in real time, create incidents, send alerts, and enforce subscription-based limits.

---

# 2. Functional Requirements

## 2.1 Authentication System

### Features
- Email/password registration
- Secure password hashing (bcrypt, cost >= 12)
- JWT access tokens (15 min expiry)
- Refresh tokens (7 days expiry, httpOnly cookie)
- Google OAuth (optional v2)
- Password reset via token (1-hour expiry)
- Email verification flow

### Security Rules
- Rate limit login attempts
- Lock account after 5 failed attempts (temporary 15 min)
- Store only hashed passwords
- Store hashed reset tokens

---

## 2.2 Multi-Tenant Architecture

### Workspace Model
Each workspace represents one organization.

Rules:
- Every monitor belongs to one workspace
- Every incident belongs to one workspace
- Every user can belong to multiple workspaces
- Strict workspace data isolation via workspace_id filtering

All queries MUST include workspace_id validation.

---

## 2.3 Role-Based Access Control (RBAC)

### Roles
OWNER
- Can delete workspace
- Manage billing
- Invite/remove members

ADMIN
- Manage monitors
- View billing
- Manage team

VIEWER
- View monitors
- View incidents
- Cannot modify

RBAC enforcement via middleware:
- Validate workspace membership
- Validate required role

---

## 2.4 Monitor Management

### Monitor Fields
- name
- url
- method (GET/POST)
- headers (JSON)
- body (JSON)
- expected_status_code (default 200)
- expected_keyword (optional)
- timeout_ms (default 5000)
- interval_seconds (based on plan)
- is_paused (boolean)

### Validation Rules
- URL must be valid
- Interval must respect subscription limits
- Max monitors per workspace must respect plan

---

## 2.5 Monitoring Engine

### Execution Model
Background worker using queue system (BullMQ or equivalent).

### Check Flow
1. Fetch active monitors
2. Execute HTTP request
3. Measure:
   - status_code
   - response_time_ms
   - timeout
4. Validate expected status
5. Validate expected keyword
6. Save result in monitor_checks
7. Trigger incident logic

### Failure Types
- TIMEOUT
- DNS_ERROR
- CONNECTION_ERROR
- HTTP_4XX
- HTTP_5XX
- KEYWORD_MISMATCH

---

## 2.6 Incident Engine

### Incident Creation Rules
If monitor transitions from UP → DOWN:
- Create incident
- status = OPEN
- started_at = now

If monitor transitions from DOWN → UP:
- Close incident
- status = RESOLVED
- resolved_at = now

### Incident Data
- workspace_id
- monitor_id
- started_at
- resolved_at
- duration_seconds
- failure_reason

---

## 2.7 Alert System

### Alert Triggers
- Incident opened
- Incident resolved
- Optional: periodic reminder if still down

### Notification Channels
Phase 1:
- Email (SMTP or transactional provider)

Phase 2:
- Slack Webhook

### Anti-Spam Rules
- Only alert on state change
- Optional 30-minute reminder throttle

---

## 2.8 Billing & Subscription

### Plans
FREE
- 3 monitors
- 300 sec interval minimum
- Email alerts only

PRO
- 50 monitors
- 60 sec interval minimum
- Email + Slack alerts

BUSINESS
- 500 monitors
- 10 sec interval minimum
- Priority checks

### Stripe Integration
- Stripe Checkout
- Webhook verification (signature validation required)
- Handle events:
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_failed

### Subscription States
- ACTIVE
- PAST_DUE
- CANCELED
- TRIALING

Plan enforcement middleware required.

---

# 3. Database Schema (PostgreSQL Reference)

## users
id (PK)
email (unique)
password_hash
name
created_at
updated_at

## workspaces
id (PK)
name
created_by_user_id (FK)
created_at

## workspace_members
id (PK)
workspace_id (FK)
user_id (FK)
role (OWNER, ADMIN, VIEWER)
joined_at
unique(workspace_id, user_id)

## plans
id (PK)
code
max_monitors
min_interval_seconds

## subscriptions
id (PK)
workspace_id (unique FK)
plan_id (FK)
status
stripe_customer_id
stripe_subscription_id
current_period_start
current_period_end

## monitors
id (PK)
workspace_id (FK)
name
url
method
headers_json
body_json
expected_status
expected_keyword
timeout_ms
interval_seconds
is_paused
created_at

## monitor_checks
id (PK)
workspace_id (FK)
monitor_id (FK)
checked_at
is_up
status_code
response_time_ms
error_type
error_message

## incidents
id (PK)
workspace_id (FK)
monitor_id (FK)
status
started_at
resolved_at
failure_reason

## notifications
id (PK)
workspace_id (FK)
incident_id (FK)
type
sent_at
status
error

---

# 4. API Endpoints

## Auth
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout

## Workspaces
POST /api/workspaces
GET /api/workspaces

## Monitors
POST /api/workspaces/:id/monitors
GET /api/workspaces/:id/monitors
PUT /api/workspaces/:id/monitors/:monitorId
DELETE /api/workspaces/:id/monitors/:monitorId

## Incidents
GET /api/workspaces/:id/incidents
GET /api/workspaces/:id/incidents/:incidentId

## Billing
POST /api/workspaces/:id/billing/checkout
POST /api/stripe/webhook

---

# 5. Background Job Requirements

## Job Types
- MonitorCheckJob
- IncidentEvaluationJob
- NotificationDispatchJob

## Queue Behavior
- Retry failed checks up to 3 times
- Exponential backoff
- Dead letter queue for persistent failures

---

# 6. Non-Functional Requirements

## Performance
- API response < 200ms for dashboard
- Monitoring worker scalable horizontally

## Scalability
- Stateless API servers
- Queue-based background processing
- Database indexes on workspace_id and monitor_id

## Observability
- Structured logs (JSON)
- Correlation request_id
- Health check endpoint /health

## Security
- CORS protection
- Rate limiting
- Input validation
- Webhook signature verification

---

# 7. Deployment Requirements

## Infrastructure
- Dockerized services
- Postgres
- Redis
- Reverse proxy (Nginx)

## CI/CD
- Lint on push
- Run tests
- Build container
- Deploy to staging

---

# 8. MVP Scope

Must include:
- Auth
- Workspaces
- Monitors
- Background checks
- Incident engine
- Email alerts
- Plan enforcement

Optional for V1.1:
- Slack integration
- Response time charts
- Status page

---

# 9. Success Criteria

- User can create workspace
- User can add monitor
- Monitor automatically checks
- Incident created on failure
- Email sent on failure
- Billing restricts plan limits

---

END OF SPEC

