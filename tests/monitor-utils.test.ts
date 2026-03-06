import { describe, expect, it } from "vitest";
import { classifyErrorByMessage, classifyStatusError, keywordMatch } from "../src/jobs/monitor-utils.js";

describe("monitor utils", () => {
  it("classifies status errors", () => {
    expect(classifyStatusError(404)).toBe("HTTP_4XX");
    expect(classifyStatusError(503)).toBe("HTTP_5XX");
    expect(classifyStatusError(200)).toBeNull();
  });

  it("classifies transport errors", () => {
    expect(classifyErrorByMessage("request timeout")).toBe("TIMEOUT");
    expect(classifyErrorByMessage("dns ENOTFOUND")).toBe("DNS_ERROR");
    expect(classifyErrorByMessage("connect ECONNREFUSED")).toBe("CONNECTION_ERROR");
    expect(classifyErrorByMessage("other")).toBe("UNKNOWN");
  });

  it("matches keyword case-insensitively", () => {
    expect(keywordMatch("Service is UP", "up")).toBe(true);
    expect(keywordMatch("Service is down", "up")).toBe(false);
    expect(keywordMatch("whatever", undefined)).toBe(true);
  });
});
