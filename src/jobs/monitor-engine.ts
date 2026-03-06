import { IncidentStatus, MonitorErrorType } from "@prisma/client";
import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { bullMqConnection } from "../lib/bullmq-connection.js";
import { prisma } from "../lib/prisma.js";
import { dispatchIncidentNotification } from "./notifications.js";
import { classifyErrorByMessage, classifyStatusError, keywordMatch } from "./monitor-utils.js";
import { monitorQueue, type MonitorJobData } from "./queue.js";

type CheckResult = {
  isUp: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorType: MonitorErrorType | null;
  errorMessage: string | null;
};

const executeMonitorCheck = async (monitorId: string): Promise<CheckResult> => {
  const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
  if (!monitor || monitor.deletedAt || monitor.isPaused) {
    return {
      isUp: true,
      statusCode: null,
      responseTimeMs: null,
      errorType: null,
      errorMessage: null
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), monitor.timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(monitor.url, {
      method: "GET",
      headers: { Accept: "application/json,text/plain,*/*" },
      signal: controller.signal
    });
    const responseTimeMs = Date.now() - started;
    const text = await response.text();

    const statusMatch = response.status === monitor.expectedStatus;
    const statusError = classifyStatusError(response.status);

    const keywordOk = keywordMatch(text, monitor.expectedKeyword);

    if (!statusMatch || !keywordOk) {
      return {
        isUp: false,
        statusCode: response.status,
        responseTimeMs,
        errorType: keywordOk ? statusError : "KEYWORD_MISMATCH",
        errorMessage: keywordOk
          ? `Expected status ${monitor.expectedStatus}, got ${response.status}`
          : `Keyword '${monitor.expectedKeyword}' missing from response`
      };
    }

    return {
      isUp: true,
      statusCode: response.status,
      responseTimeMs,
      errorType: null,
      errorMessage: null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      isUp: false,
      statusCode: null,
      responseTimeMs: Date.now() - started,
      errorType: classifyErrorByMessage(message),
      errorMessage: message.slice(0, 300)
    };
  } finally {
    clearTimeout(timeout);
  }
};

const handleIncidentState = async (monitorId: string, check: CheckResult) => {
  const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
  if (!monitor || monitor.deletedAt) {
    return;
  }

  const nextFailCount = check.isUp ? 0 : monitor.consecutiveFails + 1;
  const nextSuccessCount = check.isUp ? monitor.consecutiveSuccess + 1 : 0;

  const openIncident = await prisma.incident.findFirst({
    where: { monitorId, workspaceId: monitor.workspaceId, status: IncidentStatus.OPEN },
    orderBy: { startedAt: "desc" }
  });

  if (!check.isUp && nextFailCount >= 3 && !openIncident) {
    const incident = await prisma.incident.create({
      data: {
        workspaceId: monitor.workspaceId,
        monitorId,
        status: IncidentStatus.OPEN,
        failureReason: `${check.errorType ?? "UNKNOWN"}: ${check.errorMessage ?? "check failed"}`
      }
    });

    await prisma.incidentEvent.create({
      data: {
        workspaceId: monitor.workspaceId,
        incidentId: incident.id,
        type: "OPENED",
        details: incident.failureReason.slice(0, 300)
      }
    });

    await dispatchIncidentNotification({
      workspaceId: monitor.workspaceId,
      incidentId: incident.id,
      monitorName: monitor.name,
      monitorUrl: monitor.url,
      failureReason: incident.failureReason,
      type: "INCIDENT_OPENED"
    });
  }

  if (check.isUp && nextSuccessCount >= 2 && openIncident) {
    const resolvedAt = new Date();
    const durationSeconds = Math.floor((resolvedAt.getTime() - openIncident.startedAt.getTime()) / 1000);

    await prisma.incident.update({
      where: { id: openIncident.id },
      data: {
        status: IncidentStatus.RESOLVED,
        resolvedAt,
        durationSeconds
      }
    });

    await prisma.incidentEvent.create({
      data: {
        workspaceId: monitor.workspaceId,
        incidentId: openIncident.id,
        type: "RESOLVED",
        details: `Recovered after ${durationSeconds}s`
      }
    });

    await dispatchIncidentNotification({
      workspaceId: monitor.workspaceId,
      incidentId: openIncident.id,
      monitorName: monitor.name,
      monitorUrl: monitor.url,
      durationSeconds,
      type: "INCIDENT_RESOLVED"
    });
  }

  await prisma.monitor.update({
    where: { id: monitorId },
    data: {
      consecutiveFails: nextFailCount,
      consecutiveSuccess: nextSuccessCount,
      lastStateUp: check.isUp
    }
  });
};

export const startWorker = () => {
  const worker = new Worker<MonitorJobData>(
    "monitor-checks",
    async (job) => {
      const { monitorId } = job.data;
      const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
      if (!monitor || monitor.deletedAt || monitor.isPaused) {
        return;
      }

      const result = await executeMonitorCheck(monitorId);

      await prisma.monitorCheck.create({
        data: {
          workspaceId: monitor.workspaceId,
          monitorId,
          isUp: result.isUp,
          statusCode: result.statusCode,
          responseTimeMs: result.responseTimeMs,
          errorType: result.errorType,
          errorMessage: result.errorMessage
        }
      });

      await handleIncidentState(monitorId, result);
    },
    {
      connection: bullMqConnection,
      concurrency: env.WORKER_CONCURRENCY
    }
  );

  worker.on("failed", (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        monitorId: job?.data?.monitorId,
        err
      },
      "monitor job failed"
    );
  });

  return worker;
};

type EnqueueFilter = {
  workspaceId?: string;
  monitorId?: string;
};

const addCheckJobs = async (monitorIds: string[], dedupeByMonitor = false) => {
  if (!monitorIds.length) {
    return 0;
  }

  await monitorQueue.addBulk(
    monitorIds.map((monitorId) => ({
      name: "monitor-check",
      data: { monitorId },
      opts: {
        attempts: 4,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
        // BullMQ rejects custom IDs containing ":".
        jobId: dedupeByMonitor ? `scheduled-${monitorId}` : undefined
      }
    }))
  );

  return monitorIds.length;
};

export const enqueueActiveMonitors = async (filter?: EnqueueFilter) => {
  const monitors = await prisma.monitor.findMany({
    where: {
      workspaceId: filter?.workspaceId,
      id: filter?.monitorId,
      isPaused: false,
      deletedAt: null
    },
    select: { id: true }
  });

  const ids = monitors.map((m) => m.id);
  return addCheckJobs(ids, false);
};

export const enqueueDueMonitors = async (filter?: EnqueueFilter) => {
  const monitors = await prisma.monitor.findMany({
    where: {
      workspaceId: filter?.workspaceId,
      id: filter?.monitorId,
      isPaused: false,
      deletedAt: null
    },
    select: { id: true, intervalSeconds: true }
  });

  if (!monitors.length) {
    return 0;
  }

  const latest = await prisma.monitorCheck.groupBy({
    by: ["monitorId"],
    where: { monitorId: { in: monitors.map((m) => m.id) } },
    _max: { checkedAt: true }
  });

  const latestMap = new Map(latest.map((row) => [row.monitorId, row._max.checkedAt ?? null]));
  const now = Date.now();

  const dueIds = monitors
    .filter((m) => {
      const last = latestMap.get(m.id);
      if (!last) return true;
      return now - last.getTime() >= m.intervalSeconds * 1000;
    })
    .map((m) => m.id);

  if (!dueIds.length) {
    return 0;
  }

  return addCheckJobs(dueIds, true);
};

export const cleanupOldChecks = async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.monitorCheck.deleteMany({
    where: { checkedAt: { lt: cutoff } }
  });
};
