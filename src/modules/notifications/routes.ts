import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireWorkspaceMembership } from "../../middleware/workspace.js";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, requireWorkspaceMembership, async (req, res) => {
  const workspaceId = req.workspaceId!;

  const notifications = await prisma.notification.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: {
      incident: {
        select: {
          id: true,
          monitorId: true,
          status: true
        }
      }
    },
    take: 100
  });

  return res.json({ notifications });
});

export { router as notificationsRouter };
