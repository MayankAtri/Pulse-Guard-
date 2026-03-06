import { Queue } from "bullmq";
import { bullMqConnection } from "../lib/bullmq-connection.js";

export const monitorQueue = new Queue("monitor-checks", { connection: bullMqConnection });

export type MonitorJobData = {
  monitorId: string;
};
