import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../modules/auth/tokens.js";

const resolveDevIdentity = async (req: Request) => {
  const email = (req.headers["x-dev-user-email"] as string | undefined)?.trim().toLowerCase() || env.DEV_USER_EMAIL;
  const name = (req.headers["x-dev-user-name"] as string | undefined)?.trim() || env.DEV_USER_NAME;

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name }
  });

  req.auth = { userId: user.id, email: user.email };
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Development bypass is explicit and can be turned off for full auth testing.
  if (env.NODE_ENV !== "production" && env.DEV_AUTH_BYPASS) {
    await resolveDevIdentity(req);
    return next();
  }

  const token = req.cookies.access_token as string | undefined;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};
