import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { mockState } from "./state.js";

const router = Router();

router.get("/health", (_req, res) => {
  return res.json({ ok: true, service: "api" });
});

router.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    return res.json({ ok: true, db: "up", redis: "up" });
  } catch {
    return res.status(503).json({ ok: false, db: "down_or_slow", redis: "down_or_slow" });
  }
});

router.get("/mock/health", (_req, res) => {
  if (!mockState.healthy) {
    return res.status(500).json({ status: "down", message: mockState.body });
  }

  return res.json({ status: "up", message: mockState.body });
});

const updateMockSchema = z.object({
  healthy: z.boolean(),
  body: z.string().min(1).max(1000).optional()
});

router.post("/mock/toggle", (req, res) => {
  const parsed = updateMockSchema.parse(req.body);
  mockState.healthy = parsed.healthy;
  if (parsed.body) {
    mockState.body = parsed.body;
  }

  return res.json({ healthy: mockState.healthy, body: mockState.body });
});

router.post("/mock/slack/webhook", (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text : undefined;
  mockState.pushSlackEvent({ text });
  return res.status(200).send("ok");
});

router.get("/mock/slack/events", (_req, res) => {
  return res.json({ events: mockState.listSlackEvents() });
});

router.delete("/mock/slack/events", (_req, res) => {
  mockState.clearSlackEvents();
  return res.status(204).send();
});

export { router as healthRouter };
