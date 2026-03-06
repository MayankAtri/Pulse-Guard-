import { WorkspaceRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { monitorQueue } from "../../jobs/queue.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireWorkspaceMembership } from "../../middleware/workspace.js";

const router = Router({ mergeParams: true });

const createSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().url(),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  expectedKeyword: z.string().trim().min(1).max(1000).optional(),
  timeoutMs: z.number().int().min(100).max(30000).default(5000),
  intervalSeconds: z.number().int().min(10).max(86400).default(env.CHECK_INTERVAL_SECONDS)
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  expectedStatus: z.number().int().min(100).max(599).optional(),
  expectedKeyword: z.string().trim().min(1).max(1000).nullable().optional(),
  timeoutMs: z.number().int().min(100).max(30000).optional(),
  intervalSeconds: z.number().int().min(10).max(86400).optional(),
  isPaused: z.boolean().optional()
});

const checksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const canViewMonitor = (role: WorkspaceRole, monitorCreatorId: string, userId: string) => {
  if (role === "OWNER" || role === "ADMIN") {
    return true;
  }

  return monitorCreatorId === userId;
};

const canEditMonitor = (role: WorkspaceRole, monitorCreatorId: string, userId: string) => {
  if (role === "OWNER" || role === "ADMIN") {
    return true;
  }

  return monitorCreatorId === userId;
};

router.post(
  "/",
  requireAuth,
  requireWorkspaceMembership,
  requireRole(["OWNER", "ADMIN"]),
  async (req, res) => {
    const workspaceId = req.workspaceId!;
    const userId = req.auth!.userId;
    const parsed = createSchema.parse(req.body);

    const monitor = await prisma.monitor.create({
      data: {
        workspaceId,
        createdByUserId: userId,
        name: parsed.name,
        url: parsed.url,
        method: "GET",
        expectedStatus: parsed.expectedStatus,
        expectedKeyword: parsed.expectedKeyword,
        timeoutMs: parsed.timeoutMs,
        intervalSeconds: parsed.intervalSeconds
      }
    });

    return res.status(201).json({ monitor });
  }
);

router.get("/", requireAuth, requireWorkspaceMembership, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const userId = req.auth!.userId;
  const role = req.workspaceRole!;

  const monitors = await prisma.monitor.findMany({
    where: {
      workspaceId,
      deletedAt: null
    },
    orderBy: { createdAt: "desc" }
  });

  const visible = monitors.filter((m) => canViewMonitor(role, m.createdByUserId, userId));
  return res.json({ monitors: visible });
});

router.put("/:monitorId", requireAuth, requireWorkspaceMembership, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const userId = req.auth!.userId;
  const role = req.workspaceRole!;
  const parsed = updateSchema.parse(req.body);

  const monitor = await prisma.monitor.findFirst({
    where: {
      id: req.params.monitorId,
      workspaceId,
      deletedAt: null
    }
  });

  if (!monitor) {
    return res.status(404).json({ error: "Monitor not found" });
  }

  if (!canEditMonitor(role, monitor.createdByUserId, userId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const updated = await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      name: parsed.name,
      expectedStatus: parsed.expectedStatus,
      expectedKeyword: parsed.expectedKeyword === null ? null : parsed.expectedKeyword,
      timeoutMs: parsed.timeoutMs,
      intervalSeconds: parsed.intervalSeconds,
      isPaused: parsed.isPaused
    }
  });

  return res.json({ monitor: updated });
});

router.get("/:monitorId/checks", requireAuth, requireWorkspaceMembership, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const userId = req.auth!.userId;
  const role = req.workspaceRole!;
  const { limit } = checksQuerySchema.parse(req.query);

  const monitor = await prisma.monitor.findFirst({
    where: {
      id: req.params.monitorId,
      workspaceId,
      deletedAt: null
    }
  });

  if (!monitor) {
    return res.status(404).json({ error: "Monitor not found" });
  }

  if (!canViewMonitor(role, monitor.createdByUserId, userId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const checks = await prisma.monitorCheck.findMany({
    where: {
      workspaceId,
      monitorId: monitor.id
    },
    orderBy: { checkedAt: "desc" },
    take: limit
  });

  return res.json({ checks });
});

router.post("/:monitorId/run-check", requireAuth, requireWorkspaceMembership, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const userId = req.auth!.userId;
  const role = req.workspaceRole!;

  const monitor = await prisma.monitor.findFirst({
    where: {
      id: req.params.monitorId,
      workspaceId,
      deletedAt: null
    }
  });

  if (!monitor) {
    return res.status(404).json({ error: "Monitor not found" });
  }

  if (!canEditMonitor(role, monitor.createdByUserId, userId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  if (monitor.isPaused) {
    return res.status(409).json({ error: "Monitor is paused" });
  }

  const job = await monitorQueue.add(
    "monitor-check",
    { monitorId: monitor.id },
    {
      attempts: 4,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false
    }
  );

  return res.status(202).json({ queued: true, jobId: job.id, monitorId: monitor.id });
});

router.delete("/:monitorId", requireAuth, requireWorkspaceMembership, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const userId = req.auth!.userId;
  const role = req.workspaceRole!;

  const monitor = await prisma.monitor.findFirst({
    where: {
      id: req.params.monitorId,
      workspaceId,
      deletedAt: null
    }
  });

  if (!monitor) {
    return res.status(404).json({ error: "Monitor not found" });
  }

  if (!canEditMonitor(role, monitor.createdByUserId, userId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: { deletedAt: new Date(), isPaused: true }
  });

  return res.status(204).send();
});

export { router as monitorsRouter };
