import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

type PrimaryTool =
  | "player-trend-search"
  | "pitch-mix-shift-detector"
  | "lineup-impact-engine"
  | "schedule-fatigue-index"
  | "human-review";

const querySchema = z.object({
  query: z.string().trim().min(3).max(500),
});

const feedSchema = z
  .object({
    recordsReceived: z.number().int().nonnegative(),
    recordsExpected: z.number().int().positive(),
    maxAgeMinutes: z.number().nonnegative(),
    duplicateRecords: z.number().int().nonnegative(),
    anomalyRate: z.number().min(0).max(1),
  })
  .refine((feed) => feed.duplicateRecords <= feed.recordsReceived, {
    message: "duplicateRecords cannot exceed recordsReceived",
    path: ["duplicateRecords"],
  });

const routes: Array<{
  primaryTool: PrimaryTool;
  signals: string[];
  controls: string[];
}> = [
  {
    primaryTool: "pitch-mix-shift-detector",
    signals: ["pitch mix", "arsenal", "pitch usage"],
    controls: ["feed-reliability-monitor", "claim-citation-checker"],
  },
  {
    primaryTool: "lineup-impact-engine",
    signals: ["lineup", "expected runs", "batting order"],
    controls: ["feed-reliability-monitor", "claim-citation-checker"],
  },
  {
    primaryTool: "schedule-fatigue-index",
    signals: ["travel", "fatigue", "bullpen workload", "schedule"],
    controls: ["feed-reliability-monitor"],
  },
  {
    primaryTool: "player-trend-search",
    signals: ["last ", "trend", "striking out", "strikeouts", "hits", "home runs"],
    controls: ["feed-reliability-monitor", "claim-citation-checker", "tip-evidence-gate"],
  },
];

export const app = new Hono();

app.get("/health", (context) => context.json({ status: "ok", version: "0.1.0" }));

app.post("/v1/query-plan", zValidator("json", querySchema), (context) => {
  const { query } = context.req.valid("json");
  const normalized = query.toLowerCase();
  const candidates = routes
    .map((route) => ({
      primaryTool: route.primaryTool,
      controls: route.controls,
      matchedSignals: route.signals
        .filter((signal) => normalized.includes(signal))
        .map((signal) => signal.trim()),
    }))
    .filter((candidate) => candidate.matchedSignals.length > 0)
    .sort((a, b) => b.matchedSignals.length - a.matchedSignals.length);

  const best = candidates[0];
  if (!best) {
    return context.json({
      primaryTool: "human-review",
      controls: [],
      confidence: 0,
      reasons: ["no-supported-question-family"],
      candidates: [],
    });
  }

  const tied = candidates.filter(
    (candidate) => candidate.matchedSignals.length === best.matchedSignals.length,
  );
  if (tied.length > 1) {
    return context.json({
      primaryTool: "human-review",
      controls: [],
      confidence: 0,
      reasons: ["ambiguous-supported-question-families"],
      candidates: tied,
    });
  }

  const runnerUpScore = candidates[1]?.matchedSignals.length ?? 0;
  const margin = best.matchedSignals.length - runnerUpScore;
  return context.json({
    primaryTool: best.primaryTool,
    controls: best.controls,
    confidence: Math.min(0.6 + best.matchedSignals.length * 0.1 + margin * 0.05, 0.95),
    reasons: best.matchedSignals.map((match) => `matched:${match}`),
    matchedSignals: best.matchedSignals,
    candidates,
  });
});

app.post("/v1/feed-check", zValidator("json", feedSchema), (context) => {
  const feed = context.req.valid("json");
  const findings: string[] = [];
  const completeness = feed.recordsReceived / feed.recordsExpected;
  if (completeness < 0.95) findings.push("low-completeness");
  if (completeness > 1) findings.push("unexpected-record-count");
  if (feed.maxAgeMinutes > 15) findings.push("stale-feed");
  if (feed.duplicateRecords > 0) findings.push("duplicate-records");
  if (feed.anomalyRate >= 0.1) findings.push("anomaly-rate-high");
  const blocked = findings.includes("low-completeness") || findings.includes("stale-feed");
  return context.json({
    decision: blocked ? "block" : findings.length > 0 ? "review" : "healthy",
    completeness,
    findings: findings.length > 0 ? findings : ["feed-within-policy"],
  });
});
