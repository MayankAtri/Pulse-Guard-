import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(100)
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.parse(req.body);
  const userId = req.auth!.userId;

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.name,
      createdByUserId: userId,
      members: {
        create: {
          userId,
          role: "OWNER"
        }
      }
    }
  });

  return res.status(201).json({ workspace });
});

router.get("/", requireAuth, async (req, res) => {
  const userId = req.auth!.userId;

  const workspaces = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: true
    },
    orderBy: { joinedAt: "desc" }
  });

  return res.json({
    workspaces: workspaces.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      role: m.role,
      joinedAt: m.joinedAt
    }))
  });
});

export { router as workspacesRouter };
