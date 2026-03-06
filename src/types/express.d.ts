import type { WorkspaceRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email: string;
      };
      workspaceRole?: WorkspaceRole;
      workspaceId?: string;
    }
  }
}

export {};
