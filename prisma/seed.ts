import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.ENABLE_DEMO_SEED !== "true") {
    console.log("Seed skipped (set ENABLE_DEMO_SEED=true to enable demo data).");
    return;
  }

  const passwordHash = await bcrypt.hash("Passw0rd!", 12);

  const owner = await prisma.user.upsert({
    where: { email: "demo-owner@pulseguard.local" },
    update: {},
    create: {
      email: "demo-owner@pulseguard.local",
      name: "Demo Owner",
      passwordHash
    }
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Demo Workspace",
      createdByUserId: owner.id
    }
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: owner.id
      }
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: owner.id,
      role: "OWNER"
    }
  });

  await prisma.monitor.upsert({
    where: { id: "00000000-0000-0000-0000-000000000101" },
    update: {
      name: "HealNet Health",
      url: "https://heal-net.onrender.com/health",
      expectedKeyword: "ok",
      isPaused: false,
      deletedAt: null
    },
    create: {
      id: "00000000-0000-0000-0000-000000000101",
      workspaceId: workspace.id,
      createdByUserId: owner.id,
      name: "HealNet Health",
      url: "https://heal-net.onrender.com/health",
      method: "GET",
      expectedStatus: 200,
      expectedKeyword: "ok",
      timeoutMs: 5000,
      intervalSeconds: 60
    }
  });

  await prisma.monitor.upsert({
    where: { id: "00000000-0000-0000-0000-000000000102" },
    update: {
      name: "Local Mock Health",
      url: "http://api:4000/mock/health",
      expectedKeyword: "up",
      isPaused: false,
      deletedAt: null
    },
    create: {
      id: "00000000-0000-0000-0000-000000000102",
      workspaceId: workspace.id,
      createdByUserId: owner.id,
      name: "Local Mock Health",
      url: "http://api:4000/mock/health",
      method: "GET",
      expectedStatus: 200,
      expectedKeyword: "up",
      timeoutMs: 5000,
      intervalSeconds: 60
    }
  });

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
