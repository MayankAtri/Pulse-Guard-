import { env } from "./config/env.js";
import { cleanupOldChecks, enqueueDueMonitors, startWorker } from "./jobs/monitor-engine.js";
import { logger } from "./lib/logger.js";

const worker = startWorker();

const tick = async () => {
  try {
    await enqueueDueMonitors();
    await cleanupOldChecks();
  } catch (error) {
    logger.error({ err: error }, "worker tick failed");
  }
};

void tick();
const timer = setInterval(() => {
  void tick();
}, env.SCHEDULER_TICK_SECONDS * 1000);

const shutdown = async () => {
  clearInterval(timer);
  await worker.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
