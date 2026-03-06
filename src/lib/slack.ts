import { logger } from "./logger.js";

type SlackMessage = {
  webhookUrl: string;
  text: string;
};

export const sendSlackMessage = async ({ webhookUrl, text }: SlackMessage) => {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook failed: ${response.status} ${body}`);
  }

  logger.info({ webhookUrl }, "slack notification sent");
};
