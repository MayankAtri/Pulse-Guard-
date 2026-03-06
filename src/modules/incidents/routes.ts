import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireWorkspaceMembership } from "../../middleware/workspace.js";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, requireWorkspaceMembership, async (req, res) => {
  const workspaceId = req.workspaceId!;

  const incidents = await prisma.incident.findMany({
    where: { workspaceId },
    orderBy: { startedAt: "desc" },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true
        }
      }
    }
  });

  return res.json({ incidents });
});

router.get("/:incidentId", requireAuth, requireWorkspaceMembership, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const incidentId = req.params.incidentId;

  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      workspaceId
    },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true
        }
      },
      events: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!incident) {
    return res.status(404).json({ error: "Incident not found" });
  }

  return res.json({ incident });
});

export { router as incidentsRouter };
