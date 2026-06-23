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
    <div className="min-h-screen py-10 px-4 md:px-8 max-w-4xl mx-auto flex flex-col justify-between fade-in-up font-sans">
      {/* ── Top Nav Header ── */}
      <div>
        <header className="flex justify-between items-center mb-8 pb-6 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏭</span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-primary">
                ShortsFactory Admin
              </h1>
              <p className="text-xs text-on-surface-variant font-mono">System Automation & Controls</p>
            </div>
          </div>
          <Link href="/preview" className="px-4 py-2 text-xs font-semibold rounded-md border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
            ← Dashboard
          </Link>
          <Link href="/library" className="px-4 py-2 text-xs font-semibold rounded-md border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
            🎬 Library
          </Link>
          <Link href="/analytics" className="px-4 py-2 text-xs font-semibold rounded-md border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
            📊 Analytics
          </Link>
        </header>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/30 text-error text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Main Control Section ── */}
        {loading ? (
          <div className="bg-surface-container border border-outline-variant rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-center">
            <div className="spinner border-t-primary w-12 h-12 border-4"></div>
            <p className="text-sm text-on-surface-variant font-mono">Syncing with Cloud Firestore...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Kill Switch Panel (2 cols wide on medium screens) */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-6 md:col-span-2 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 block font-mono">Autonomous Loop Switch</span>
                    <h2 className="text-xl font-bold text-on-surface tracking-tight">Factory Kill Switch</h2>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono border ${
                      isFactoryActive ? "bg-primary/10 border-primary/30 text-primary" : "bg-error/10 border-error/30 text-error"
                    }`}
                  >
                    {isFactoryActive ? "🟢 ACTIVE" : "🔴 PAUSED"}
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed max-w-md">
                  When active, the background auto-scheduler script executes at the configured intervals, generating new Geo-Quiz shorts. If disabled, new automated generations are completely paused.
                </p>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-outline-variant">
                <div className="text-left">
                  <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider font-bold">
                    Last Toggled
                  </span>
                  <span className="text-xs font-mono text-on-surface">
                    {lastUpdated || "Never"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-on-surface-variant font-mono">
                    {updating ? "Syncing..." : isFactoryActive ? "Running" : "Paused"}
                  </span>
                  <div
                    onClick={toggleFactory}
                    className={`relative w-14 h-7 rounded-full cursor-pointer transition-colors border border-outline-variant ${isFactoryActive ? "bg-primary border-primary" : "bg-surface-container-high"}`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${isFactoryActive ? "translate-x-7" : ""}`}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Status Stats */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-6 flex flex-col justify-between min-h-[220px]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 block font-mono">Loop Telemetry</span>
                <h2 className="text-lg font-bold text-on-surface tracking-tight mb-4">Daily Output</h2>
                
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Scheduled:</span>
                    <span className="font-semibold text-on-surface">10 per day</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Interval:</span>
                    <span className="font-semibold text-on-surface">144 mins</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Cloud Storage:</span>
                    <span className="font-semibold text-secondary">Cloudinary API</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant text-xs text-on-surface-variant font-mono">
                ⚡ Automations run in background
              </div>
            </div>

            {/* Sub-panels for placeholders (Stats Row) */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-container-lowest border border-outline-variant flex items-center justify-center text-lg shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                🎬
              </div>
              <div>
                <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Videos Prepared</div>
                <div className="text-lg font-black text-on-surface font-mono">10 / 10</div>
              </div>
            </div>

            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-container-lowest border border-outline-variant flex items-center justify-center text-lg shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                ⏳
              </div>
              <div>
                <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Pending Renders</div>
                <div className="text-lg font-black text-on-surface font-mono">0 Active</div>
              </div>
            </div>

            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-container-lowest border border-outline-variant flex items-center justify-center text-lg shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                ☁️
              </div>
              <div>
                <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Storage Bucket</div>
                <div className="text-xs text-on-surface-variant font-medium font-mono mt-1">geo_quiz_factory/</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Feature 4: Prompt Blueprints Panel ── */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 block font-mono">Feature 4</span>
              <h2 className="text-lg font-bold text-on-surface tracking-tight">Niche Prompt Blueprints</h2>
              <p className="text-xs text-on-surface-variant mt-1">Edit the dynamic LLM system/user prompts fetched from Firestore at generation time.</p>
            </div>
            <button onClick={fetchBlueprint} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">↻ Reload</button>
          </div>
          {bpLoading ? (
            <div className="text-on-surface-variant text-sm font-mono">Loading blueprint...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-on-surface-variant text-xs font-mono font-bold mb-2 uppercase tracking-wider">System Prompt</label>
                <textarea
                  rows={5}
                  value={blueprint?.systemPrompt ?? ""}
                  onChange={e => setBlueprint(b => ({ ...b, systemPrompt: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-xs text-on-surface font-mono resize-y outline-none focus:border-primary transition-colors"
                  placeholder="Enter the system prompt for Groq LPU calls..."
                />
              </div>
              <div>
                <label className="block text-on-surface-variant text-xs font-mono font-bold mb-2 uppercase tracking-wider">User Prompt Template</label>
                <textarea
                  rows={5}
                  value={blueprint?.userPromptTemplate ?? ""}
                  onChange={e => setBlueprint(b => ({ ...b, userPromptTemplate: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-xs text-on-surface font-mono resize-y outline-none focus:border-primary transition-colors"
                  placeholder="Enter the user prompt template (use {countryName}, {tone}, {numQuestions} as variables)..."
                />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={saveBlueprint}
                  disabled={bpSaving}
                  className="bg-primary hover:bg-primary-container text-on-primary text-xs font-bold px-4 py-2 rounded-md transition-transform hover:scale-[0.98]"
                >
                  {bpSaving ? "Saving..." : "💾 Save Blueprint to Firestore"}
                </button>
                {bpMsg && <span className="text-xs text-on-surface-variant font-mono">{bpMsg}</span>}
              </div>
            </div>
          )}
        </div>

        {/* ── Feature 6: Branding Presets Panel ── */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6 mt-6">
          <div className="mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 block font-mono">Feature 6</span>
            <h2 className="text-lg font-bold text-on-surface tracking-tight">Branding Presets</h2>
            <p className="text-xs text-on-surface-variant mt-1">Configure watermark text stamped on every generated video frame.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-on-surface-variant text-xs font-mono font-bold mb-2 uppercase tracking-wider">Watermark Text</label>
              <input
                type="text"
                value={brandText}
                onChange={e => setBrandText(e.target.value)}
                placeholder="@YourChannel"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-sm text-on-surface outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-on-surface-variant text-xs font-mono font-bold mb-2 uppercase tracking-wider">Position</label>
              <select
                value={brandPos}
                onChange={e => setBrandPos(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-sm text-on-surface outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="top_right">Top Right</option>
                <option value="top_left">Top Left</option>
                <option value="bottom_right">Bottom Right</option>
                <option value="bottom_left">Bottom Left</option>
              </select>
            </div>
            <div>
              <label className="block text-on-surface-variant text-xs font-mono font-bold mb-2 uppercase tracking-wider">Primary Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={brandColor}
                  onChange={e => setBrandColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-outline-variant bg-surface-container-lowest cursor-pointer"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={e => setBrandColor(e.target.value)}
                  className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-sm text-on-surface font-mono outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={saveBrandPreset}
              disabled={brandSaving}
              className="bg-primary hover:bg-primary-container text-on-primary text-xs font-bold px-4 py-2 rounded-md transition-transform hover:scale-[0.98]"
            >
              {brandSaving ? "Saving..." : "💾 Save Branding Preset"}
            </button>
            {brandMsg && <span className="text-xs text-on-surface-variant font-mono">{brandMsg}</span>}
          </div>
          <p className="text-[10px] text-on-surface-variant/70 mt-4 font-mono">
            Preset is stored locally. To apply on render, the Preview page reads it and sends it in the render payload.
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-16 text-center text-[11px] text-on-surface-variant/70 font-mono leading-normal">
        <p>ShortsFactory Control Center v3.0 • F4: Blueprints • F6: Branding • Firestore Authenticated</p>
      </footer>
    </div>
  );
}
