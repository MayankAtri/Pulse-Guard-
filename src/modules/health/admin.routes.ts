import { Router } from "express";
import { enqueueActiveMonitors } from "../../jobs/monitor-engine.js";
import { monitorQueue } from "../../jobs/queue.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/queue-stats", requireAuth, async (_req, res) => {
  const [waiting, active, delayed, failed, completed] = await Promise.all([
    monitorQueue.getWaitingCount(),
    monitorQueue.getActiveCount(),
    monitorQueue.getDelayedCount(),
    monitorQueue.getFailedCount(),
    monitorQueue.getCompletedCount()
  ]);

  return res.json({
    queue: "monitor-checks",
    waiting,
    active,
    delayed,
    failed,
    completed
  });
});

router.post("/run-checks", requireAuth, async (req, res) => {
  const workspaceId = req.body?.workspaceId as string | undefined;
  const monitorId = req.body?.monitorId as string | undefined;

  const enqueued = await enqueueActiveMonitors({ workspaceId, monitorId });

  return res.json({
    queue: "monitor-checks",
    enqueued,
    filter: {
      workspaceId: workspaceId ?? null,
      monitorId: monitorId ?? null
    }
  });
});

export { router as adminRouter };
