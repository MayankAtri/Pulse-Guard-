import { config } from "dotenv";
import { z } from "zod";

config();

const envBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return value;
}, z.boolean());

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/pulseguard"),
  DIRECT_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/pulseguard"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(16).default("dev_access_secret_change_me_123"),
  JWT_REFRESH_SECRET: z.string().min(16).default("dev_refresh_secret_change_me_123"),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  COOKIE_DOMAIN: z.string().optional(),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:5173"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  EMAIL_TRANSPORT: z.enum(["log", "smtp"]).default("log"),
  EMAIL_FROM: z.string().email().default("noreply@pulseguard.local"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  DEV_AUTH_BYPASS: envBoolean.default(true),
  DEV_USER_EMAIL: z.string().email().default("owner@pulseguard.local"),
  DEV_USER_NAME: z.string().default("Local Owner"),
  WORKER_CONCURRENCY: z.coerce.number().default(5),
  SCHEDULER_TICK_SECONDS: z.coerce.number().default(5),
  CHECK_INTERVAL_SECONDS: z.coerce.number().default(60),
  BCRYPT_ROUNDS: z.coerce.number().min(12).default(12),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("warn")
});

export const env = schema.parse(process.env);

export const corsOrigins = env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
