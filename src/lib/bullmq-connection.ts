import { URL } from "node:url";
import type { ConnectionOptions } from "bullmq";
import { env } from "../config/env.js";

const parsed = new URL(env.REDIS_URL);

export const bullMqConnection: ConnectionOptions = {
  host: parsed.hostname,
  port: Number(parsed.port || 6379),
  username: parsed.username || undefined,
  password: parsed.password || undefined,
  db: parsed.pathname ? Number(parsed.pathname.replace("/", "") || 0) : 0,
  maxRetriesPerRequest: null
};
