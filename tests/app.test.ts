import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("POST /v1/query-plan", () => {
  it("returns a governed plan for a player trend question", async () => {
    const response = await app.request("/v1/query-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "Is Aaron Judge striking out more over his last 10 away games?" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      primaryTool: "player-trend-search",
      controls: ["feed-reliability-monitor", "claim-citation-checker", "tip-evidence-gate"],
    });
  });

  it("rejects an empty query", async () => {
    const response = await app.request("/v1/query-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "" }),
    });
    expect(response.status).toBe(400);
  });
});

describe("POST /v1/feed-check", () => {
  it("blocks a stale feed", async () => {
    const response = await app.request("/v1/feed-check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recordsReceived: 100,
        recordsExpected: 100,
        maxAgeMinutes: 30,
        duplicateRecords: 0,
        anomalyRate: 0.01,
      }),
    });
    expect(await response.json()).toMatchObject({ decision: "block" });
  });
});

describe("GET /health", () => {
  it("returns service health and version", async () => {
    const response = await app.request("/health");
    expect(await response.json()).toEqual({ status: "ok", version: "0.1.0" });
  });
});
