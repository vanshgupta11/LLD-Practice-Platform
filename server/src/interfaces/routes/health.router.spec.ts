import request from "supertest";
import { createApp } from "../../app";

describe("Health API Router", () => {
  const app = createApp();

  it("GET /api/health should return 200 OK with service details", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    expect(res.body.service).toBe("cipher-lld-server");
  });
});
