import fs from "fs";
import path from "path";

import { LLMProvider } from "../ai/provider";

const JOBS_DIR = path.join(process.cwd(), "gen-v", "generated", "jobs");
const MANIFEST_EXTENSION = ".json";

export type ProviderTelemetryEvent = {
  provider: LLMProvider;
  timestamp: string; // ISO

  // parsing/repair
  directParseSuccess: boolean;
  regexFallbackUsed: boolean;
  retryCount: number;

  // execution outcome (derived from whether the attempt ultimately produced valid JSON)
  outcome: "success" | "failure";

  // counts the modeled call attempt where telemetry was produced
  // (first try: 0, second try: 1, ...)
  attemptIndex: number;
};

export type ProviderReliabilityRow = {
  provider: LLMProvider;
  parseSuccessRate: number; // 0-1
  avgRetries: number;
  calls: number;
};

function safeReadJson<T>(p: string): T | null {
  try {
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf-8");
    if (!raw.trim()) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function listJobManifests(): string[] {
  if (!fs.existsSync(JOBS_DIR)) return [];
  const entries = fs.readdirSync(JOBS_DIR);
  return entries
    .filter((f) => f.endsWith(MANIFEST_EXTENSION) && f !== "index.json")
    .map((f) => path.join(JOBS_DIR, f));
}

export function aggregateProviderReliability(): ProviderReliabilityRow[] {
  const manifests = listJobManifests();

  const byProvider: Record<string, { calls: number; successCalls: number; retrySum: number }> = {};

  for (const manifestPath of manifests) {
    const manifest = safeReadJson<any>(manifestPath);
    const events: ProviderTelemetryEvent[] = Array.isArray(manifest?.providerTelemetry)
      ? manifest.providerTelemetry
      : [];

    for (const e of events) {
      if (!e || !e.provider) continue;
      const provider = e.provider as LLMProvider;
      if (!byProvider[provider]) {
        byProvider[provider] = { calls: 0, successCalls: 0, retrySum: 0 };
      }

      byProvider[provider].calls += 1;
      if (e.directParseSuccess && e.outcome === "success") {
        byProvider[provider].successCalls += 1;
      }
      byProvider[provider].retrySum += typeof e.retryCount === "number" ? e.retryCount : 0;
    }
  }

  const rows: ProviderReliabilityRow[] = Object.entries(byProvider).map(([provider, agg]) => {
    return {
      provider: provider as LLMProvider,
      parseSuccessRate: agg.calls ? agg.successCalls / agg.calls : 0,
      avgRetries: agg.calls ? agg.retrySum / agg.calls : 0,
      calls: agg.calls,
    };
  });

  rows.sort((a, b) => b.calls - a.calls);
  return rows;
}

