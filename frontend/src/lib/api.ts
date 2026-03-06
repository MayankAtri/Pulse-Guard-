import {
  type AlertsConfig,
  type Incident,
  type IncidentDetail,
  type Monitor,
  type MonitorCheck,
  type Notification,
  type QueueStats,
  type User,
  type WorkspaceMember,
  type Workspace
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    credentials: "include"
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new ApiError(response.status, (data.error as string) ?? "Request failed", data);
  }

  return data as T;
}

export const authApi = {
  signup: (body: { email: string; password: string; name: string }) =>
    request<{ user: User }>("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  google: (body: { idToken: string }) => request<{ user: User }>("/api/auth/google", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<{ user: User }>("/api/auth/me"),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  requestReset: (body: { email: string }) =>
    request<{ ok: boolean; resetTokenForLocalDev?: string }>("/api/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  confirmReset: (body: { token: string; newPassword: string }) =>
    request<void>("/api/auth/password-reset/confirm", { method: "POST", body: JSON.stringify(body) })
};

export const workspaceApi = {
  list: () => request<{ workspaces: Workspace[] }>("/api/workspaces"),
  create: (body: { name: string }) => request<{ workspace: Workspace }>("/api/workspaces", { method: "POST", body: JSON.stringify(body) })
};

export const monitorApi = {
  list: (workspaceId: string) => request<{ monitors: Monitor[] }>(`/api/workspaces/${workspaceId}/monitors`),
  create: (
    workspaceId: string,
    body: {
      name: string;
      url: string;
      expectedStatus: number;
      expectedKeyword?: string;
      timeoutMs: number;
      intervalSeconds?: number;
    }
  ) => request<{ monitor: Monitor }>(`/api/workspaces/${workspaceId}/monitors`, { method: "POST", body: JSON.stringify(body) }),
  update: (
    workspaceId: string,
    monitorId: string,
    body: Partial<{
      name: string;
      expectedStatus: number;
      expectedKeyword: string | null;
      timeoutMs: number;
      intervalSeconds: number;
      isPaused: boolean;
    }>
  ) =>
    request<{ monitor: Monitor }>(`/api/workspaces/${workspaceId}/monitors/${monitorId}`, {
      method: "PUT",
      body: JSON.stringify(body)
    }),
  checks: (workspaceId: string, monitorId: string, limit = 20) =>
    request<{ checks: MonitorCheck[] }>(`/api/workspaces/${workspaceId}/monitors/${monitorId}/checks?limit=${limit}`),
  runCheck: (workspaceId: string, monitorId: string) =>
    request<{ queued: true; jobId: string; monitorId: string }>(`/api/workspaces/${workspaceId}/monitors/${monitorId}/run-check`, {
      method: "POST"
    }),
  remove: (workspaceId: string, monitorId: string) =>
    request<void>(`/api/workspaces/${workspaceId}/monitors/${monitorId}`, { method: "DELETE" })
};

export const incidentApi = {
  list: (workspaceId: string) => request<{ incidents: Incident[] }>(`/api/workspaces/${workspaceId}/incidents`),
  get: (workspaceId: string, incidentId: string) =>
    request<{ incident: IncidentDetail }>(`/api/workspaces/${workspaceId}/incidents/${incidentId}`)
};

export const notificationApi = {
  list: (workspaceId: string) => request<{ notifications: Notification[] }>(`/api/workspaces/${workspaceId}/notifications`)
};

export const alertsApi = {
  get: (workspaceId: string) => request<{ alerts: AlertsConfig }>(`/api/workspaces/${workspaceId}/alerts`),
  update: (workspaceId: string, body: Partial<{ slackEnabled: boolean; slackWebhookUrl: string | null }>) =>
    request<{ alerts: AlertsConfig }>(`/api/workspaces/${workspaceId}/alerts`, { method: "PUT", body: JSON.stringify(body) })
};

export const workspaceMembersApi = {
  list: (workspaceId: string) => request<{ members: WorkspaceMember[] }>(`/api/workspaces/${workspaceId}/members`),
  add: (workspaceId: string, body: { email: string; name?: string; role: "OWNER" | "ADMIN" | "VIEWER" }) =>
    request<{ member: WorkspaceMember }>(`/api/workspaces/${workspaceId}/members`, { method: "POST", body: JSON.stringify(body) }),
  updateRole: (workspaceId: string, memberId: string, body: { role: "OWNER" | "ADMIN" | "VIEWER" }) =>
    request<{ member: WorkspaceMember }>(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: "PUT",
      body: JSON.stringify(body)
    }),
  remove: (workspaceId: string, memberId: string) => request<void>(`/api/workspaces/${workspaceId}/members/${memberId}`, { method: "DELETE" })
};

export const adminApi = {
  queueStats: () => request<QueueStats>("/api/admin/queue-stats"),
  runChecks: (body?: { workspaceId?: string; monitorId?: string }) =>
    request<{ queue: string; enqueued: number; filter: { workspaceId: string | null; monitorId: string | null } }>(
      "/api/admin/run-checks",
      { method: "POST", body: JSON.stringify(body ?? {}) }
    )
};

export const dashboardApi = {
  analytics: (workspaceId: string, range: "1h" | "24h" | "7d" | "30d" = "24h") =>
    request<{
      range: "1h" | "24h" | "7d" | "30d";
      summary: {
        totalMonitors: number;
        openIncidents: number;
        avgLatencyMs: number;
        p50LatencyMs: number;
        p95LatencyMs: number;
        p99LatencyMs: number;
        mttrMinutes: number;
        mttdMinutes: number;
        sloHealthPercent: number;
        burnRatePercent: number;
      };
      queue: QueueStats;
      monitorCoverage: {
        optimal: number;
        fault: number;
        paused: number;
      };
      flappingMonitorIds: string[];
      errorBreakdown: Array<{
        errorType: string;
        count: number;
        percentage: number;
      }>;
      alertDelivery: {
        EMAIL: { sent: number; failed: number };
        SLACK: { sent: number; failed: number };
      };
      uptimeByMonitor: Array<{
        monitorId: string;
        name: string;
        uptime24h: number | null;
        uptime7d: number | null;
        uptime30d: number | null;
      }>;
      needsAttention: Array<{
        monitorId: string;
        name: string;
        score: number;
      }>;
      recentChecks: MonitorCheck[];
      recentIncidents: Incident[];
    }>(`/api/workspaces/${workspaceId}/dashboard/analytics?range=${range}`)
};
