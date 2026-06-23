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
    <div className="min-h-screen pt-8 pb-16 px-6 md:px-10 max-w-6xl mx-auto font-sans text-on-surface">
      {/* ── Top Header ── */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold tracking-tight">ShortsFactory Pro</h1>
        <div className="flex items-center gap-4">
          <Link href="/preview" className="px-3 py-1.5 text-xs font-semibold rounded bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface-variant">
            Dashboard
          </Link>
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="text-xs">A</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded bg-error/10 border border-error/30 text-error text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ── Main Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          
          {/* Card 1: Render Telemetry (from Image 1) */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 15v4c0 1.1.9 2 2 2h14v-4"/><path d="M3 11v4h18v-4H3z"/></svg>
                Render Telemetry
              </div>
              <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">Active</span>
            </div>
            
            <div className="flex items-end gap-3 mb-6">
              <span className="text-5xl font-bold text-primary leading-none">72</span>
              <span className="text-xs text-on-surface-variant mb-1">Current API Health</span>
            </div>

            {/* Fake Bar Chart */}
            <div className="h-32 flex items-end gap-2 border-b border-surface-container-high pb-2">
              <div className="w-full bg-surface-container-highest rounded-t-sm" style={{height: '40%'}}></div>
              <div className="w-full bg-surface-container-highest rounded-t-sm" style={{height: '35%'}}></div>
              <div className="w-full bg-surface-container-highest rounded-t-sm" style={{height: '60%'}}></div>
              <div className="w-full bg-surface-container-highest rounded-t-sm" style={{height: '45%'}}></div>
              <div className="w-full bg-surface-container-highest rounded-t-sm" style={{height: '55%'}}></div>
              <div className="w-full bg-surface-container-highest rounded-t-sm" style={{height: '65%'}}></div>
              <div className="w-full bg-primary rounded-t-sm" style={{height: '80%'}}></div>
            </div>
            <div className="flex justify-between text-[10px] text-on-surface-variant mt-2 px-1">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>

          {/* Card 2: Prompt Blueprints (from Image 1) */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                Prompt Blueprints
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">System Role Configuration</label>
                <select className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2.5 text-xs outline-none">
                  <option>Instructional Tone (Default)</option>
                  <option>Humorous Tone</option>
                  <option>Professional Tone</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">Output Format Schema</label>
                <select className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2.5 text-xs outline-none">
                  <option>JSON with Video Metadata</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">System Instructions</label>
              <textarea
                rows={3}
                value={blueprint?.systemPrompt ?? "You are an expert short-form video scriptwriter..."}
                onChange={e => setBlueprint(b => ({ ...b, systemPrompt: e.target.value }))}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-xs font-mono outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={saveBlueprint}
                disabled={bpSaving}
                className="bg-surface-container-highest hover:bg-surface-bright border border-outline-variant text-xs font-medium px-4 py-2 rounded transition-colors flex items-center gap-2"
              >
                {bpSaving ? "Saving..." : "Save Blueprint Changes"}
              </button>
            </div>
            {bpMsg && <p className="text-xs text-on-surface-variant mt-2 text-right">{bpMsg}</p>}
          </div>

          {/* Card 3: Brand Presets (from Image 4) */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold tracking-tight mb-1">Brand Presets</h2>
            <p className="text-sm text-on-surface-variant mb-6">Configure global branding elements for video output. These settings override individual project configs.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Brand Color */}
              <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                  Primary Brand Color
                </div>
                <p className="text-[11px] text-on-surface-variant mb-4 leading-relaxed">
                  Select a primary brand color to apply across generated components. Custom HEX codes are supported.
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center border border-white/20"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                  <div className="w-8 h-8 rounded-full bg-blue-500 cursor-pointer"></div>
                  <div className="w-8 h-8 rounded-full bg-red-500 cursor-pointer"></div>
                  <div className="w-8 h-8 rounded-full bg-amber-500 cursor-pointer"></div>
                  <div className="w-8 h-8 rounded-full bg-purple-500 cursor-pointer"></div>
                  <div className="w-8 h-8 rounded-full border border-dashed border-outline-variant flex items-center justify-center cursor-pointer">
                    <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="opacity-0 absolute w-8 h-8" />
                    <span className="text-xs">+</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-on-surface-variant text-xs">HEX</div>
                  <input
                    type="text"
                    value={brandColor}
                    onChange={e => setBrandColor(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2 pl-10 text-xs font-mono outline-none"
                  />
                </div>
              </div>

              {/* Global Watermark */}
              <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Global Watermark
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-on-surface-variant">Enabled</span>
                    <div className="w-8 h-4 rounded-full bg-primary relative cursor-pointer"><div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5"></div></div>
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant mb-4 leading-relaxed">
                  A subtle watermark applied to the bottom right of the video frame.
                </p>
                <div className="w-full bg-surface-container-lowest border border-outline-variant rounded aspect-video relative flex items-center justify-center mb-3 overflow-hidden">
                  <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center opacity-50"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/40 backdrop-blur rounded text-[8px] font-medium border border-white/10">
                    <input type="text" value={brandText} onChange={e => setBrandText(e.target.value)} className="bg-transparent outline-none w-16 text-right" placeholder="@Watermark" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                  <span>Opacity: 60%</span>
                  <div className="flex-1 h-1 bg-surface-container-high rounded overflow-hidden">
                    <div className="w-[60%] h-full bg-primary"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-start">
               <button
                onClick={saveBrandPreset}
                disabled={brandSaving}
                className="bg-primary hover:bg-primary-container text-on-primary text-xs font-bold px-5 py-2.5 rounded transition-transform hover:scale-[0.98]"
              >
                {brandSaving ? "Saving..." : "Save Preset"}
              </button>
            </div>
          </div>
          
        </div>

        {/* Right Sidebar */}
        <div className="hidden lg:block space-y-6">
          <div className="bg-surface-container border border-outline-variant rounded-xl flex flex-col h-[500px] overflow-hidden">
             <div className="bg-surface-container-highest px-4 py-2 border-b border-outline-variant flex justify-between items-center text-[10px] font-mono text-on-surface-variant">
               <span>► Telemetry Engine</span>
               <div className="flex gap-1">
                 <div className="w-2 h-2 rounded-full bg-surface-container-lowest"></div>
                 <div className="w-2 h-2 rounded-full bg-surface-container-lowest"></div>
                 <div className="w-2 h-2 rounded-full bg-surface-container-lowest"></div>
               </div>
             </div>
             <div className="flex-1 p-4 bg-[#0a0b0e] font-mono text-[10px] leading-relaxed overflow-y-auto">
               <div className="text-on-surface-variant mb-2">[SYS] Engine initialized. v3.4.1</div>
               <div className="text-primary mb-2">[OK] Connect to WSS://render-pool-alpha</div>
               <div className="text-on-surface-variant mb-2">2026-06-23T14:22:10Z Queue job #89212</div>
               <div className="text-on-surface-variant mb-2">2026-06-23T14:22:15Z <span className="text-primary">Allocated GPU Node 4</span></div>
               <div className="text-on-surface-variant mb-2">2026-06-23T14:23:01Z Encoding...</div>
               <div className="text-primary mb-4">[OK] Job #89212 Complete</div>
               <div className="text-on-surface-variant mb-2">2026-06-23T14:25:00Z Idle state.</div>
               <div className="animate-pulse">_</div>
             </div>
          </div>
          
          {/* Card 4: Hook Matrix Engine (from Image 1) */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Hook Matrix Engine
              </div>
              <div
                onClick={toggleFactory}
                className="w-8 h-4 rounded-full relative cursor-pointer transition-colors"
                style={{ backgroundColor: isFactoryActive ? 'var(--color-primary)' : 'var(--color-surface-container-highest)' }}
              >
                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${isFactoryActive ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-container-lowest border border-primary/30 rounded p-3 relative overflow-hidden">
                <div className="absolute top-2 right-2"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M22 11.08V12a10 10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Variant A</div>
                <p className="text-[11px] leading-snug">"Stop scrolling! Did you know this secret about..."</p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded p-3">
                <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Variant B</div>
                <p className="text-[11px] leading-snug">"The most mysterious location in the world is..."</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
