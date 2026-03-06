import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

type EmailInput = {
  to: string[];
  subject: string;
  text: string;
};

const smtpTransport =
  env.EMAIL_TRANSPORT === "smtp" && env.SMTP_HOST && env.SMTP_PORT
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
      })
    : null;

export const sendEmail = async ({ to, subject, text }: EmailInput) => {
  if (!to.length) {
    return { messageId: "no-recipients" };
  }

  if (env.EMAIL_TRANSPORT === "smtp") {
    if (!smtpTransport) {
      throw new Error("SMTP transport is not configured");
    }

    const result = await smtpTransport.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      text
    });

    return { messageId: result.messageId };
  }

  logger.info({ to, subject, text }, "email notification (log transport)");
  return { messageId: `log-${Date.now()}` };
};
