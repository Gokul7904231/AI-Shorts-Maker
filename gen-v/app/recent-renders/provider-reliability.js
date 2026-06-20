"use client";

import { useEffect, useState } from "react";

function fmtPct(x) {
  const v = typeof x === "number" && Number.isFinite(x) ? x * 100 : 0;
  return `${v.toFixed(0)}%`;
}

function fmtRetries(x) {
  const v = typeof x === "number" && Number.isFinite(x) ? x : 0;
  return v.toFixed(1);
}

export default function ProviderReliabilityPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/provider-reliability");
        const json = await res.json();
        if (!mounted) return;
        setRows(Array.isArray(json?.rows) ? json.rows : []);
      } catch {
        if (!mounted) return;
        setRows([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mt-6 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Provider Reliability</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Parse success + retry behavior based on completed-job telemetry.
          </div>
        </div>
        {loading ? (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Loading…</div>
        ) : (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{rows.length ? `${rows.length} providers` : "No data"}</div>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2 pr-3">Provider</th>
              <th className="py-2 pr-3">Parse Success</th>
              <th className="py-2 pr-3">Avg Retries</th>
              <th className="py-2">Calls</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-xs text-zinc-500 dark:text-zinc-400">
                  No telemetry yet. Generate a job to populate provider metrics.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.provider}
                  className="border-b border-zinc-100 dark:border-zinc-900 last:border-b-0"
                >
                  <td className="py-2 pr-3 font-medium text-zinc-900 dark:text-zinc-50">{r.provider}</td>
                  <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-200">{fmtPct(r.parseSuccessRate)}</td>
                  <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-200">{fmtRetries(r.avgRetries)}</td>
                  <td className="py-2 text-zinc-700 dark:text-zinc-200">{r.calls}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

