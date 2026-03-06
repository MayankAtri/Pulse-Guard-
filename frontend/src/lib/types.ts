export type User = {
  id: string;
  email: string;
  name: string;
};

export type WorkspaceRole = "OWNER" | "ADMIN" | "VIEWER";

export type Workspace = {
  id: string;
  name: string;
  role: WorkspaceRole;
  joinedAt: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
};

export type Monitor = {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  name: string;
  url: string;
  expectedStatus: number;
  expectedKeyword: string | null;
  timeoutMs: number;
  intervalSeconds: number;
  isPaused: boolean;
  deletedAt: string | null;
  lastStateUp: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export type MonitorCheck = {
  id: string;
  workspaceId: string;
  monitorId: string;
  checkedAt: string;
  isUp: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorType: string | null;
  errorMessage: string | null;
};

export type IncidentStatus = "OPEN" | "RESOLVED";

export type Incident = {
  id: string;
  workspaceId: string;
  monitorId: string;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt: string | null;
  durationSeconds: number | null;
  failureReason: string;
  createdAt: string;
  updatedAt: string;
  monitor: {
    id: string;
    name: string;
    url: string;
  };
};

export type IncidentEvent = {
  id: string;
  workspaceId: string;
  incidentId: string;
  type: "OPENED" | "RESOLVED";
  details: string | null;
  createdAt: string;
};

export type IncidentDetail = Incident & {
  events: IncidentEvent[];
};

export type Notification = {
  id: string;
  workspaceId: string;
  incidentId: string;
  type: "INCIDENT_OPENED" | "INCIDENT_RESOLVED";
  channel: "EMAIL" | "SLACK";
  status: "SENT" | "FAILED";
  sentAt: string | null;
  error: string | null;
  createdAt: string;
  incident: {
    id: string;
    monitorId: string;
    status: IncidentStatus;
  };
};

export type AlertsConfig = {
  id: string;
  slackEnabled: boolean;
  slackWebhookUrl: string | null;
};

export type QueueStats = {
  queue: string;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
};
