import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireWorkspaceMembership } from "../../middleware/workspace.js";

const router = Router({ mergeParams: true });

const updateSchema = z.object({
  slackEnabled: z.boolean().optional(),
  slackWebhookUrl: z.string().url().nullable().optional()
});

router.get("/", requireAuth, requireWorkspaceMembership, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      slackEnabled: true,
      slackWebhookUrl: true
    }
  });

  return res.json({ alerts: workspace });
});

router.put("/", requireAuth, requireWorkspaceMembership, requireRole(["OWNER", "ADMIN"]), async (req, res) => {
  const workspaceId = req.workspaceId!;
  const parsed = updateSchema.parse(req.body);

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      slackEnabled: parsed.slackEnabled,
      slackWebhookUrl: parsed.slackWebhookUrl === null ? null : parsed.slackWebhookUrl
    },
    select: {
      id: true,
      slackEnabled: true,
      slackWebhookUrl: true
    }
  });

  return res.json({ alerts: workspace });
});

export { router as workspaceAlertsRouter };
