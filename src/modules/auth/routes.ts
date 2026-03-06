import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { comparePassword, hashPassword, randomToken, sha256 } from "../../lib/crypto.js";
import { clearAuthCookies, setAuthCookies } from "./cookies.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./tokens.js";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const resetRequestSchema = z.object({
  email: z.string().email()
});

const resetConfirmSchema = z.object({
  token: z.string().min(20),
  newPassword: z.string().min(8)
});

const googleSchema = z.object({
  idToken: z.string().min(20)
});

const nowPlusDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const createDefaultWorkspace = async (userId: string, userName: string) => {
  const workspace = await prisma.workspace.create({
    data: {
      name: `${userName}'s Workspace`,
      createdByUserId: userId,
      members: {
        create: {
          userId,
          role: "OWNER"
        }
      }
    }
  });

  return workspace;
};

const issueSession = async (userId: string, email: string, userAgent?: string, ipAddress?: string) => {
  await prisma.refreshSession.deleteMany({ where: { userId } });

  const payload = { sub: userId, email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshSession.create({
    data: {
      userId,
      tokenHash: sha256(refreshToken),
      userAgent,
      ipAddress,
      expiresAt: nowPlusDays(env.REFRESH_TOKEN_TTL_DAYS)
    }
  });

  return { accessToken, refreshToken };
};

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existing?.passwordHash) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await hashPassword(parsed.password);
  let user = existing;

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: parsed.email,
        name: parsed.name,
        passwordHash
      }
    });

    await createDefaultWorkspace(user.id, parsed.name);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, name: parsed.name }
    });
  }

  const { accessToken, refreshToken } = await issueSession(user.id, user.email, req.headers["user-agent"], req.ip);
  setAuthCookies(res, accessToken, refreshToken);

  return res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    return res.status(423).json({ error: "Account temporarily locked" });
  }

  const ok = await comparePassword(parsed.password, user.passwordHash);
  if (!ok) {
    const failedAttempts = user.failedLoginAttempts + 1;
    const shouldLock = failedAttempts >= 5;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : failedAttempts,
        lockoutUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null
      }
    });

    return res.status(401).json({ error: "Invalid credentials" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockoutUntil: null
    }
  });

  const { accessToken, refreshToken } = await issueSession(user.id, user.email, req.headers["user-agent"], req.ip);
  setAuthCookies(res, accessToken, refreshToken);

  return res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

router.post("/google", async (req, res) => {
  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    return res.status(400).json({ error: "Google auth is not configured" });
  }

  const parsed = googleSchema.parse(req.body);
  const ticket = await googleClient.verifyIdToken({
    idToken: parsed.idToken,
    audience: env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();

  if (!payload?.email || !payload.sub) {
    return res.status(400).json({ error: "Invalid Google token payload" });
  }

  let user = await prisma.user.findUnique({ where: { email: payload.email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name ?? payload.email,
        googleSubject: payload.sub,
        emailVerifiedAt: new Date()
      }
    });
    await createDefaultWorkspace(user.id, user.name);
  } else if (!user.googleSubject) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleSubject: payload.sub,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date()
      }
    });
  }

  const { accessToken, refreshToken } = await issueSession(user.id, user.email, req.headers["user-agent"], req.ip);
  setAuthCookies(res, accessToken, refreshToken);

  return res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies.refresh_token as string | undefined;
  if (!refreshToken) {
    return res.status(401).json({ error: "Missing refresh token" });
  }

  let payload: { sub: string; email: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const session = await prisma.refreshSession.findFirst({
    where: {
      userId: payload.sub,
      tokenHash: sha256(refreshToken),
      expiresAt: { gt: new Date() },
      revokedAt: null
    }
  });

  if (!session) {
    return res.status(401).json({ error: "Refresh session not found" });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  const nextTokens = await issueSession(user.id, user.email, req.headers["user-agent"], req.ip);
  setAuthCookies(res, nextTokens.accessToken, nextTokens.refreshToken);

  return res.json({ ok: true });
});

router.post("/logout", requireAuth, async (req, res) => {
  const refreshToken = req.cookies.refresh_token as string | undefined;

  if (refreshToken && req.auth?.userId) {
    await prisma.refreshSession.updateMany({
      where: { userId: req.auth.userId, tokenHash: sha256(refreshToken) },
      data: { revokedAt: new Date() }
    });
  }

  clearAuthCookies(res);
  return res.status(204).send();
});

router.post("/password-reset/request", async (req, res) => {
  const parsed = resetRequestSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: parsed.email } });

  if (!user) {
    return res.status(202).json({ ok: true });
  }

  const plainToken = randomToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(plainToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    }
  });

  return res.status(202).json({ ok: true, resetTokenForLocalDev: plainToken });
});

router.post("/password-reset/confirm", async (req, res) => {
  const parsed = resetConfirmSchema.parse(req.body);
  const tokenHash = sha256(parsed.token);

  const token = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() }
    }
  });

  if (!token) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  const passwordHash = await hashPassword(parsed.newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash }
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() }
    }),
    prisma.refreshSession.deleteMany({ where: { userId: token.userId } })
  ]);

  clearAuthCookies(res);
  return res.status(204).send();
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: { id: true, email: true, name: true } });
  return res.json({ user });
});

export { router as authRouter };
