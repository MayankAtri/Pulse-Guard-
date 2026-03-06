import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("health routes", () => {
  it("returns healthy", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("supports mock toggle", async () => {
    const down = await request(app).post("/mock/toggle").send({ healthy: false, body: "forced down" });
    expect(down.status).toBe(200);

    const checkDown = await request(app).get("/mock/health");
    expect(checkDown.status).toBe(500);

    await request(app).post("/mock/toggle").send({ healthy: true, body: "up again" });
    const checkUp = await request(app).get("/mock/health");
    expect(checkUp.status).toBe(200);
  });
});
