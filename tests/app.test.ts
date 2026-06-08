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

  it("chooses the strongest matching question family instead of the first match", async () => {
    const response = await app.request("/v1/query-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "How does travel affect this lineup and its expected runs?",
      }),
    });

    expect(await response.json()).toMatchObject({
      primaryTool: "lineup-impact-engine",
      matchedSignals: ["lineup", "expected runs"],
    });
  });

  it("routes tied question families to human review", async () => {
    const response = await app.request("/v1/query-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "Compare lineup changes with travel effects" }),
    });

    expect(await response.json()).toMatchObject({
      primaryTool: "human-review",
      reasons: ["ambiguous-supported-question-families"],
    });
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

  it("reviews a batch that contains more records than expected", async () => {
    const response = await app.request("/v1/feed-check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recordsReceived: 110,
        recordsExpected: 100,
        maxAgeMinutes: 2,
        duplicateRecords: 0,
        anomalyRate: 0.01,
      }),
    });

    expect(await response.json()).toMatchObject({
      decision: "review",
      findings: ["unexpected-record-count"],
    });
  });

  it("rejects duplicate counts larger than the received batch", async () => {
    const response = await app.request("/v1/feed-check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recordsReceived: 10,
        recordsExpected: 10,
        maxAgeMinutes: 2,
        duplicateRecords: 11,
        anomalyRate: 0.01,
      }),
    });

    expect(response.status).toBe(400);
  });
});

describe("GET /health", () => {
  it("returns service health and version", async () => {
    const response = await app.request("/health");
    expect(await response.json()).toEqual({ status: "ok", version: "0.1.0" });
  });
});
