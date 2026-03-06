import { NotificationChannel, NotificationStatus, NotificationType } from "@prisma/client";
import { sendEmail } from "../lib/email.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { sendSlackMessage } from "../lib/slack.js";

type DispatchInput = {
  workspaceId: string;
  incidentId: string;
  monitorName: string;
  monitorUrl: string;
  failureReason?: string;
  durationSeconds?: number | null;
  type: NotificationType;
};

const subjectFor = (type: NotificationType, monitorName: string) => {
  if (type === "INCIDENT_OPENED") {
    return `[PulseGuard] INCIDENT OPENED: ${monitorName}`;
  }

  return `[PulseGuard] INCIDENT RESOLVED: ${monitorName}`;
};

const textFor = (input: DispatchInput) => {
  if (input.type === "INCIDENT_OPENED") {
    return [
      "Incident opened.",
      `Monitor: ${input.monitorName}`,
      `URL: ${input.monitorUrl}`,
      `Reason: ${input.failureReason ?? "Unknown"}`,
      `Incident ID: ${input.incidentId}`
    ].join("\n");
  }

  return [
    "Incident resolved.",
    `Monitor: ${input.monitorName}`,
    `URL: ${input.monitorUrl}`,
    `Duration (seconds): ${input.durationSeconds ?? "n/a"}`,
    `Incident ID: ${input.incidentId}`
  ].join("\n");
};

export const dispatchIncidentNotification = async (input: DispatchInput) => {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: input.workspaceId },
    include: { user: { select: { email: true } } }
  });
  const recipients = Array.from(new Set(members.map((m) => m.user.email).filter(Boolean)));

  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { slackEnabled: true, slackWebhookUrl: true }
  });

  const dispatchChannel = async (channel: NotificationChannel, sender: () => Promise<void>) => {
    const existing = await prisma.notification.findFirst({
      where: { incidentId: input.incidentId, type: input.type, channel },
      orderBy: { createdAt: "desc" }
    });

    if (existing?.status === NotificationStatus.SENT) {
      return;
    }

    try {
      await sender();

      if (existing) {
        await prisma.notification.update({
          where: { id: existing.id },
          data: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            error: null
          }
        });
      } else {
        await prisma.notification.create({
          data: {
            workspaceId: input.workspaceId,
            incidentId: input.incidentId,
            type: input.type,
            channel,
            status: NotificationStatus.SENT,
            sentAt: new Date()
          }
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown notification error";
      if (existing) {
        await prisma.notification.update({
          where: { id: existing.id },
          data: {
            status: NotificationStatus.FAILED,
            error: message.slice(0, 500)
          }
        });
      } else {
        await prisma.notification.create({
          data: {
            workspaceId: input.workspaceId,
            incidentId: input.incidentId,
            type: input.type,
            channel,
            status: NotificationStatus.FAILED,
            error: message.slice(0, 500)
          }
        });
      }

      logger.error(
        { err: error, incidentId: input.incidentId, type: input.type, channel },
        "notification dispatch failed"
      );
    }
  };

  await dispatchChannel("EMAIL", async () => {
    await sendEmail({
      to: recipients,
      subject: subjectFor(input.type, input.monitorName),
      text: textFor(input)
    });
  });

  if (workspace?.slackEnabled && workspace.slackWebhookUrl) {
    await dispatchChannel("SLACK", async () => {
      await sendSlackMessage({
        webhookUrl: workspace.slackWebhookUrl!,
        text: textFor(input)
      });
    });
  }
};
