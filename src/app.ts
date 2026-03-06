import "express-async-errors";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { nanoid } from "nanoid";
import { corsOrigins } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/routes.js";
import { adminRouter } from "./modules/health/admin.routes.js";
import { healthRouter } from "./modules/health/routes.js";
import { incidentsRouter } from "./modules/incidents/routes.js";
import { monitorsRouter } from "./modules/monitors/routes.js";
import { notificationsRouter } from "./modules/notifications/routes.js";
import { workspaceAlertsRouter } from "./modules/workspaces/alerts.routes.js";
import { workspaceDashboardRouter } from "./modules/workspaces/dashboard.routes.js";
import { workspaceMembersRouter } from "./modules/workspaces/members.routes.js";
import { workspacesRouter } from "./modules/workspaces/routes.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin blocked"));
    },
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use((req, res, next) => {
  const requestId = (req.headers["x-request-id"] as string) || nanoid();
  res.setHeader("x-request-id", requestId);
  (req as any).requestId = requestId;

  logger.debug({ method: req.method, path: req.path, requestId }, "request");
  next();
});

app.use(healthRouter);
app.use("/api/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/workspaces", workspacesRouter);
app.use("/api/workspaces/:id/monitors", monitorsRouter);
app.use("/api/workspaces/:id/incidents", incidentsRouter);
app.use("/api/workspaces/:id/notifications", notificationsRouter);
app.use("/api/workspaces/:id/alerts", workspaceAlertsRouter);
app.use("/api/workspaces/:id/dashboard", workspaceDashboardRouter);
app.use("/api/workspaces/:id/members", workspaceMembersRouter);

app.use(notFoundHandler);
app.use(errorHandler);
