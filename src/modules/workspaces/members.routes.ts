import { WorkspaceRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireWorkspaceMembership } from "../../middleware/workspace.js";

const router = Router({ mergeParams: true });

const createMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  role: z.enum(["OWNER", "ADMIN", "VIEWER"]).default("VIEWER")
});

const updateRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "VIEWER"])
});

const ensureCanManageOwner = (requesterRole: WorkspaceRole, targetRole: WorkspaceRole, nextRole?: WorkspaceRole) => {
  if (requesterRole === "OWNER") return true;
  if (targetRole === "OWNER") return false;
  if (nextRole === "OWNER") return false;
  return true;
};

router.get("/", requireAuth, requireWorkspaceMembership, async (req, res) => {
  const workspaceId = req.workspaceId!;

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }]
  });

  return res.json({
    members: members.map((m) => ({
      id: m.id,
      workspaceId: m.workspaceId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user
    }))
  });
});

router.post("/", requireAuth, requireWorkspaceMembership, requireRole(["OWNER", "ADMIN"]), async (req, res) => {
  const workspaceId = req.workspaceId!;
  const requesterRole = req.workspaceRole!;
  const parsed = createMemberSchema.parse(req.body);

  const email = parsed.email.trim().toLowerCase();
  const fallbackName = parsed.name?.trim() || email.split("@")[0] || "User";

  if (!ensureCanManageOwner(requesterRole, "VIEWER", parsed.role)) {
    return res.status(403).json({ error: "Only OWNER can assign OWNER role" });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: parsed.name?.trim() || undefined
    },
    create: {
      email,
      name: fallbackName
    }
  });

  const existing = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: user.id
      }
    }
  });

  if (existing && !ensureCanManageOwner(requesterRole, existing.role, parsed.role)) {
    return res.status(403).json({ error: "Only OWNER can update OWNER membership" });
  }

  const member = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: user.id
      }
    },
    update: {
      role: parsed.role
    },
    create: {
      workspaceId,
      userId: user.id,
      role: parsed.role
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  return res.status(201).json({ member });
});

router.put("/:memberId", requireAuth, requireWorkspaceMembership, requireRole(["OWNER", "ADMIN"]), async (req, res) => {
  const workspaceId = req.workspaceId!;
  const requesterRole = req.workspaceRole!;
  const parsed = updateRoleSchema.parse(req.body);

  const member = await prisma.workspaceMember.findFirst({
    where: {
      id: req.params.memberId,
      workspaceId
    }
  });

  if (!member) {
    return res.status(404).json({ error: "Member not found" });
  }

  if (!ensureCanManageOwner(requesterRole, member.role, parsed.role)) {
    return res.status(403).json({ error: "Only OWNER can change OWNER role assignments" });
  }

  if (member.role === "OWNER" && parsed.role !== "OWNER") {
    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: "OWNER" }
    });

    if (ownerCount <= 1) {
      return res.status(409).json({ error: "Workspace must have at least one OWNER" });
    }
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: member.id },
    data: { role: parsed.role },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  return res.json({ member: updated });
});

router.delete("/:memberId", requireAuth, requireWorkspaceMembership, requireRole(["OWNER", "ADMIN"]), async (req, res) => {
  const workspaceId = req.workspaceId!;
  const requesterRole = req.workspaceRole!;

  const member = await prisma.workspaceMember.findFirst({
    where: {
      id: req.params.memberId,
      workspaceId
    }
  });

  if (!member) {
    return res.status(404).json({ error: "Member not found" });
  }

  if (!ensureCanManageOwner(requesterRole, member.role)) {
    return res.status(403).json({ error: "Only OWNER can remove OWNER membership" });
  }

  if (member.role === "OWNER") {
    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: "OWNER" }
    });

    if (ownerCount <= 1) {
      return res.status(409).json({ error: "Workspace must have at least one OWNER" });
    }
  }

  await prisma.workspaceMember.delete({ where: { id: member.id } });
  return res.status(204).send();
});

export { router as workspaceMembersRouter };
