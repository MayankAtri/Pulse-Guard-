import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation error", details: err.flatten() });
  }

  logger.error({ err }, "unhandled error");
  return res.status(500).json({ error: "Internal server error" });
};
