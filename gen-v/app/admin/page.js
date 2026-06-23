"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [isFactoryActive, setIsFactoryActive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  // Feature 4: Prompt Blueprints panel state
  const [blueprint, setBlueprint] = useState(null);
  const [bpLoading, setBpLoading] = useState(false);
  const [bpSaving, setBpSaving] = useState(false);
  const [bpMsg, setBpMsg] = useState("");

  // Feature 6: Branding Presets panel state
  const [brandText, setBrandText] = useState("");
  const [brandPos, setBrandPos] = useState("top_right");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMsg, setBrandMsg] = useState("");

  useEffect(() => {
    setMounted(true);
    fetchState();
    fetchBlueprint();
    loadBrandPreset();
  }, []);

  async function fetchState() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/factory-state");
      if (!res.ok) throw new Error("Failed to load factory state");
      const json = await res.json();
      setIsFactoryActive(json.isFactoryActive ?? true);
      if (json.lastUpdated) {
        setLastUpdated(new Date(json.lastUpdated).toLocaleString());
      }
    } catch (e) {
      setError(e?.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function toggleFactory() {
    if (updating) return;

    const previousValue = isFactoryActive;
    const newValue = !previousValue;

    // Optimistic update
    setIsFactoryActive(newValue);
    setUpdating(true);
    setError("");

    try {
      const res = await fetch("/api/admin/factory-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFactoryActive: newValue }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error ?? "Failed to save state");
      }

      const json = await res.json();
      if (json.lastUpdated) {
        setLastUpdated(new Date(json.lastUpdated).toLocaleString());
      }
    } catch (e) {
      setError(e?.message ?? "Failed to update factory state");
      // Revert optimistic update
      setIsFactoryActive(previousValue);
    } finally {
      setUpdating(false);
    }
  }

  // Feature 4: Blueprint management
  async function fetchBlueprint() {
    setBpLoading(true);
    try {
      // Read via a dedicated API endpoint (reuses existing admin route pattern)
      const res = await fetch("/api/admin/blueprint");
      if (res.ok) {
        const d = await res.json();
        setBlueprint(d);
      }
    } catch {}
    finally { setBpLoading(false); }
  }

  async function saveBlueprint() {
    if (!blueprint) return;
    setBpSaving(true);
    setBpMsg("");
    try {
      const res = await fetch("/api/admin/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blueprint),
      });
      const d = await res.json();
      setBpMsg(res.ok ? "✅ Blueprint saved!" : `❌ ${d.error}`);
    } catch (e) {
      setBpMsg(`❌ ${e.message}`);
    } finally {
      setBpSaving(false);
    }
  }

  // Feature 6: Branding Presets (stored in localStorage for simplicity)
  function loadBrandPreset() {
    try {
      const saved = localStorage.getItem("brand_preset");
      if (saved) {
        const p = JSON.parse(saved);
        setBrandText(p.watermarkText ?? "");
        setBrandPos(p.watermarkPosition ?? "top_right");
        setBrandColor(p.primaryColor ?? "#6366f1");
      }
    } catch {}
  }

  function saveBrandPreset() {
    setBrandSaving(true);
    setBrandMsg("");
    try {
      localStorage.setItem("brand_preset", JSON.stringify({
        watermarkText: brandText,
        watermarkPosition: brandPos,
        primaryColor: brandColor,
      }));
      setBrandMsg("✅ Branding preset saved locally!");
    } catch (e) {
      setBrandMsg(`❌ ${e.message}`);
    } finally {
      setBrandSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 max-w-4xl mx-auto flex flex-col justify-between fade-in-up">
      {/* ── Top Nav Header ── */}
      <div>
        <header className="flex justify-between items-center mb-8 pb-6 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏭</span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gradient-violet">
                ShortsFactory Admin
              </h1>
              <p className="text-xs text-zinc-500">System Automation & Controls</p>
            </div>
          </div>
          <Link href="/preview" className="btn btn-ghost py-2 px-4 text-xs font-semibold">
            ← Dashboard
          </Link>
          <Link href="/library" className="btn btn-ghost py-2 px-4 text-xs font-semibold">
            🎬 Library
          </Link>
          <Link href="/analytics" className="btn btn-ghost py-2 px-4 text-xs font-semibold">
            📊 Analytics
          </Link>
        </header>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Main Control Section ── */}
        {loading ? (
          <div className="glass-card p-12 flex flex-col items-center justify-center gap-4 text-center">
            <div className="spinner spinner-violet spinner-lg"></div>
            <p className="text-sm text-zinc-400">Syncing with Cloud Firestore...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Kill Switch Panel (2 cols wide on medium screens) */}
            <div className="glass-card p-6 md:col-span-2 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="field-label field-label-accent">Autonomous Loop Switch</span>
                    <h2 className="text-xl font-bold text-zinc-100">Factory Kill Switch</h2>
                  </div>
                  <div
                    className={`badge ${
                      isFactoryActive ? "badge-emerald glow-emerald" : "badge-red"
                    }`}
                  >
                    {isFactoryActive ? "🟢 ACTIVE" : "🔴 PAUSED"}
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-md">
                  When active, the background auto-scheduler script executes at the configured intervals, generating new Geo-Quiz shorts. If disabled, new automated generations are completely paused.
                </p>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-800/40">
                <div className="text-left">
                  <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">
                    Last Toggled
                  </span>
                  <span className="text-xs font-mono text-zinc-300">
                    {lastUpdated || "Never"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">
                    {updating ? "Syncing..." : isFactoryActive ? "Running" : "Paused"}
                  </span>
                  <div
                    onClick={toggleFactory}
                    className={`toggle-track ${isFactoryActive ? "active" : ""}`}
                  >
                    <div className="toggle-thumb"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Status Stats */}
            <div className="glass-card p-6 flex flex-col justify-between min-h-[220px]">
              <div>
                <span className="field-label">Loop Telemetry</span>
                <h2 className="text-lg font-bold text-zinc-100 mb-4">Daily Output</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Scheduled:</span>
                    <span className="font-semibold text-zinc-300">10 per day</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Interval:</span>
                    <span className="font-semibold text-zinc-300">144 mins</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Cloud Storage:</span>
                    <span className="font-semibold text-cyan-400">Cloudinary API</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/40 text-xs text-zinc-500">
                ⚡ Automations run in background
              </div>
            </div>

            {/* Sub-panels for placeholders (Stats Row) */}
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-lg">
                🎬
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Videos Prepared</div>
                <div className="text-lg font-black text-zinc-200 font-mono">10 / 10</div>
              </div>
            </div>

            <div className="glass-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-lg">
                ⏳
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Pending Renders</div>
                <div className="text-lg font-black text-zinc-200 font-mono">0 Active</div>
              </div>
            </div>

            <div className="glass-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-lg">
                ☁️
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Storage Bucket</div>
                <div className="text-xs text-zinc-400 font-medium">geo_quiz_factory/</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Feature 4: Prompt Blueprints Panel ── */}
        <div className="glass-card p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="field-label field-label-accent">Feature 4</span>
              <h2 className="text-lg font-bold text-zinc-100">Niche Prompt Blueprints</h2>
              <p className="text-xs text-zinc-400 mt-1">Edit the dynamic LLM system/user prompts fetched from Firestore at generation time.</p>
            </div>
            <button onClick={fetchBlueprint} className="btn btn-ghost text-xs px-3 py-1">↻ Reload</button>
          </div>
          {bpLoading ? (
            <div className="text-zinc-500 text-sm">Loading blueprint...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="field-label block mb-2">System Prompt</label>
                <textarea
                  rows={5}
                  value={blueprint?.systemPrompt ?? ""}
                  onChange={e => setBlueprint(b => ({ ...b, systemPrompt: e.target.value }))}
                  className="w-full bg-zinc-900/60 border border-zinc-700/60 rounded-xl p-3 text-xs text-zinc-300 font-mono resize-y"
                  placeholder="Enter the system prompt for Groq LPU calls..."
                />
              </div>
              <div>
                <label className="field-label block mb-2">User Prompt Template</label>
                <textarea
                  rows={5}
                  value={blueprint?.userPromptTemplate ?? ""}
                  onChange={e => setBlueprint(b => ({ ...b, userPromptTemplate: e.target.value }))}
                  className="w-full bg-zinc-900/60 border border-zinc-700/60 rounded-xl p-3 text-xs text-zinc-300 font-mono resize-y"
                  placeholder="Enter the user prompt template (use {countryName}, {tone}, {numQuestions} as variables)..."
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={saveBlueprint}
                  disabled={bpSaving}
                  className="btn btn-violet text-xs px-4 py-2"
                >
                  {bpSaving ? "Saving..." : "💾 Save Blueprint to Firestore"}
                </button>
                {bpMsg && <span className="text-xs text-zinc-300">{bpMsg}</span>}
              </div>
            </div>
          )}
        </div>

        {/* ── Feature 6: Branding Presets Panel ── */}
        <div className="glass-card p-6 mt-6">
          <div className="mb-4">
            <span className="field-label field-label-accent">Feature 6</span>
            <h2 className="text-lg font-bold text-zinc-100">Branding Presets</h2>
            <p className="text-xs text-zinc-400 mt-1">Configure watermark text stamped on every generated video frame.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="field-label block mb-2">Watermark Text</label>
              <input
                type="text"
                value={brandText}
                onChange={e => setBrandText(e.target.value)}
                placeholder="@YourChannel"
                className="w-full bg-zinc-900/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-300"
              />
            </div>
            <div>
              <label className="field-label block mb-2">Position</label>
              <select
                value={brandPos}
                onChange={e => setBrandPos(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-300"
              >
                <option value="top_right">Top Right</option>
                <option value="top_left">Top Left</option>
                <option value="bottom_right">Bottom Right</option>
                <option value="bottom_left">Bottom Left</option>
              </select>
            </div>
            <div>
              <label className="field-label block mb-2">Primary Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={brandColor}
                  onChange={e => setBrandColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-zinc-700/60 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={e => setBrandColor(e.target.value)}
                  className="flex-1 bg-zinc-900/60 border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-300 font-mono"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveBrandPreset}
              disabled={brandSaving}
              className="btn btn-violet text-xs px-4 py-2"
            >
              {brandSaving ? "Saving..." : "💾 Save Branding Preset"}
            </button>
            {brandMsg && <span className="text-xs text-zinc-300">{brandMsg}</span>}
          </div>
          <p className="text-[10px] text-zinc-600 mt-3">
            Preset is stored locally. To apply on render, the Preview page reads it and sends it in the render payload.
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-16 text-center text-[11px] text-zinc-600 leading-normal">
        <p>ShortsFactory Control Center v3.0 • F4: Blueprints • F6: Branding • Firestore Authenticated</p>
      </footer>
    </div>
  );
}
