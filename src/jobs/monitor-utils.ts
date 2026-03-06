import type { MonitorErrorType } from "@prisma/client";

export const classifyStatusError = (status: number): MonitorErrorType | null => {
  if (status >= 400 && status <= 499) {
    return "HTTP_4XX";
  }
  if (status >= 500) {
    return "HTTP_5XX";
  }
  return null;
};

export const classifyErrorByMessage = (message: string): MonitorErrorType => {
  const lower = message.toLowerCase();
  if (lower.includes("timeout") || lower.includes("aborted")) {
    return "TIMEOUT";
  }
  if (lower.includes("dns") || lower.includes("enotfound")) {
    return "DNS_ERROR";
  }
  if (lower.includes("connect") || lower.includes("econnrefused") || lower.includes("network")) {
    return "CONNECTION_ERROR";
  }
  return "UNKNOWN";
};

export const keywordMatch = (body: string, expectedKeyword?: string | null) => {
  if (!expectedKeyword) {
    return true;
  }

  return body.toLowerCase().includes(expectedKeyword.toLowerCase());
};
