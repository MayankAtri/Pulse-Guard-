import type { NextFunction, Request, Response } from "express";
import type { WorkspaceRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const requireWorkspaceMembership = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const workspaceId = req.params.id;
  if (!workspaceId) {
    return res.status(400).json({ error: "workspace id is required" });
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: req.auth.userId
      }
    }
  });

  if (!membership) {
    return res.status(403).json({ error: "Forbidden" });
  }

  req.workspaceRole = membership.role;
  req.workspaceId = workspaceId;
  return next();
};

export const requireRole = (allowed: WorkspaceRole[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.workspaceRole || !allowed.includes(req.workspaceRole)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  return next();
};
