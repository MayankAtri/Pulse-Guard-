import { Router } from "express";
import { z } from "zod";
import { monitorQueue } from "../../jobs/queue.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireWorkspaceMembership } from "../../middleware/workspace.js";

const router = Router({ mergeParams: true });

const querySchema = z.object({
  range: z.enum(["1h", "24h", "7d", "30d"]).default("24h")
});

const rangeMs: Record<"1h" | "24h" | "7d" | "30d", number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000
};

const percentile = (nums: number[], p: number) => {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
};

router.get("/analytics", requireAuth, requireWorkspaceMembership, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const parsed = querySchema.parse(req.query);

  const now = Date.now();
  const from = new Date(now - rangeMs[parsed.range]);

  const [monitors, checks, incidents, notifications, waiting, active, delayed, failed, completed] = await Promise.all([
    prisma.monitor.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true, name: true, createdByUserId: true, isPaused: true, lastStateUp: true, intervalSeconds: true }
    }),
    prisma.monitorCheck.findMany({
      where: { workspaceId, checkedAt: { gte: from } },
      orderBy: { checkedAt: "desc" },
      select: {
        id: true,
        monitorId: true,
        checkedAt: true,
        isUp: true,
        statusCode: true,
        responseTimeMs: true,
        errorType: true
      },
      take: 10000
    }),
    prisma.incident.findMany({
      where: {
        workspaceId,
        OR: [{ startedAt: { gte: from } }, { resolvedAt: { gte: from } }, { status: "OPEN" }]
      },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        monitorId: true,
        status: true,
        startedAt: true,
        resolvedAt: true,
        durationSeconds: true,
        failureReason: true
      }
    }),
    prisma.notification.findMany({
      where: { workspaceId, createdAt: { gte: from } },
      select: { channel: true, status: true }
    }),
    monitorQueue.getWaitingCount(),
    monitorQueue.getActiveCount(),
    monitorQueue.getDelayedCount(),
    monitorQueue.getFailedCount(),
    monitorQueue.getCompletedCount()
  ]);

  const checksByMonitor = new Map<string, typeof checks>();
  for (const check of checks) {
    const arr = checksByMonitor.get(check.monitorId) ?? [];
    arr.push(check);
    checksByMonitor.set(check.monitorId, arr);
  }

  const latencyValues = checks.map((c) => c.responseTimeMs ?? 0).filter((n) => n > 0);
  const avgLatencyMs = latencyValues.length
    ? Math.round(latencyValues.reduce((sum, n) => sum + n, 0) / latencyValues.length)
    : 0;

  const failedChecks = checks.filter((c) => !c.isUp);
  const errorCounts = new Map<string, number>();
  for (const check of failedChecks) {
    const key = check.errorType ?? "UNKNOWN";
    errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
  }
  const errorBreakdown = Array.from(errorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([errorType, count]) => ({
      errorType,
      count,
      percentage: failedChecks.length ? Math.round((count / failedChecks.length) * 1000) / 10 : 0
    }));

  const resolvedIncidents = incidents.filter((i) => i.status === "RESOLVED" && i.durationSeconds !== null);
  const mttrMinutes = resolvedIncidents.length
    ? Math.round((resolvedIncidents.reduce((sum, i) => sum + (i.durationSeconds ?? 0), 0) / resolvedIncidents.length / 60) * 10) /
      10
    : 0;

  const mttdSamples: number[] = [];
  for (const incident of incidents) {
    const monitorChecks = (checksByMonitor.get(incident.monitorId) ?? [])
      .slice()
      .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime());

    const startTs = new Date(incident.startedAt).getTime();
    const precedingFail = monitorChecks
      .filter((c) => !c.isUp && new Date(c.checkedAt).getTime() <= startTs)
      .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())[0];

    if (!precedingFail) continue;
    const deltaMinutes = (startTs - new Date(precedingFail.checkedAt).getTime()) / 60000;
    if (deltaMinutes >= 0) mttdSamples.push(deltaMinutes);
  }

  const mttdMinutes = mttdSamples.length
    ? Math.round((mttdSamples.reduce((sum, n) => sum + n, 0) / mttdSamples.length) * 10) / 10
    : 0;

  const flappingMonitorIds: string[] = [];
  for (const [monitorId, monitorChecks] of checksByMonitor.entries()) {
    const ordered = monitorChecks.slice().sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime());
    let flips = 0;
    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i].isUp !== ordered[i - 1].isUp) flips += 1;
    }
    if (flips >= 4) flappingMonitorIds.push(monitorId);
  }

  const byChannel = {
    EMAIL: { sent: 0, failed: 0 },
    SLACK: { sent: 0, failed: 0 }
  };

  for (const n of notifications) {
    if (n.channel !== "EMAIL" && n.channel !== "SLACK") continue;
    if (n.status === "SENT") byChannel[n.channel].sent += 1;
    if (n.status === "FAILED") byChannel[n.channel].failed += 1;
  }

  const coverage = {
    optimal: monitors.filter((m) => !m.isPaused && m.lastStateUp !== false).length,
    fault: monitors.filter((m) => !m.isPaused && m.lastStateUp === false).length,
    paused: monitors.filter((m) => m.isPaused).length
  };

  const uptimeByMonitor = monitors.map((m) => {
    const checksForMonitor = checksByMonitor.get(m.id) ?? [];

    const forDays = (days: number) => {
      const sinceTs = now - days * 24 * 60 * 60 * 1000;
      const subset = checksForMonitor.filter((c) => new Date(c.checkedAt).getTime() >= sinceTs);
      if (!subset.length) return null;
      const up = subset.filter((c) => c.isUp).length;
      return Math.round((up / subset.length) * 1000) / 10;
    };

    return {
      monitorId: m.id,
      name: m.name,
      uptime24h: forDays(1),
      uptime7d: forDays(7),
      uptime30d: forDays(30)
    };
  });

  const needsAttention = monitors
    .map((m) => {
      let score = 0;
      if (m.isPaused) score += 2;
      if (m.lastStateUp === false) score += 5;
      if (flappingMonitorIds.includes(m.id)) score += 3;
      if (incidents.some((i) => i.monitorId === m.id && i.status === "OPEN")) score += 4;

      const mine = checksByMonitor.get(m.id) ?? [];
      if (mine.length) {
        const failRate = mine.filter((c) => !c.isUp).length / mine.length;
        if (failRate > 0.2) score += 2;
      }

      return {
        monitorId: m.id,
        name: m.name,
        score
      };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const totalChecks = checks.length;
  const failedCount = failedChecks.length;
  const burnRatePercent = totalChecks ? Math.round((failedCount / totalChecks) * 1000) / 10 : 0;

  return res.json({
    range: parsed.range,
    summary: {
      totalMonitors: monitors.length,
      openIncidents: incidents.filter((i) => i.status === "OPEN").length,
      avgLatencyMs,
      p50LatencyMs: percentile(latencyValues, 50),
      p95LatencyMs: percentile(latencyValues, 95),
      p99LatencyMs: percentile(latencyValues, 99),
      mttrMinutes,
      mttdMinutes,
      sloHealthPercent: Math.max(0, 100 - burnRatePercent),
      burnRatePercent
    },
    queue: {
      queue: "monitor-checks",
      waiting,
      active,
      delayed,
      failed,
      completed
    },
    monitorCoverage: coverage,
    flappingMonitorIds,
    errorBreakdown,
    alertDelivery: byChannel,
    uptimeByMonitor,
    needsAttention,
    recentChecks: checks.slice(0, 100),
    recentIncidents: incidents.slice(0, 20)
  });
});

export { router as workspaceDashboardRouter };
