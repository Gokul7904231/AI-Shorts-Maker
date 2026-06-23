"use client";

import { useEffect, useState } from "react";
import { 
  BarChart2, 
  Settings, 
  Terminal, 
  Network, 
  Play, 
  LayoutTemplate,
  ChevronDown,
  Star
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [isFactoryActive, setIsFactoryActive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const [blueprint, setBlueprint] = useState(null);
  const [bpLoading, setBpLoading] = useState(false);
  const [bpSaving, setBpSaving] = useState(false);
  const [bpMsg, setBpMsg] = useState("");

  useEffect(() => {
    setMounted(true);
    fetchState();
    fetchBlueprint();
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
      setIsFactoryActive(previousValue);
    } finally {
      setUpdating(false);
    }
  }

  async function fetchBlueprint() {
    setBpLoading(true);
    try {
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

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50 font-body-base">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen z-0 max-h-screen overflow-y-auto">
        <TopNav title="Command Center" />
        
        <main className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Center Column (Main Logic) */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            
            {/* Analytics 'Heatmap' Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-50 z-0"></div>
              
              <div className="relative z-10 flex justify-between items-start border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-zinc-50 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-emerald-400" />
                    Render Telemetry
                  </h2>
                  <p className="text-xs font-medium text-zinc-500 mt-1 uppercase tracking-wider">Videos Generated This Week</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">Live</span>
                </div>
              </div>

              <div className="relative z-10 flex items-end gap-3">
                <div className="text-6xl font-black text-emerald-400 tracking-tighter drop-shadow-sm">72</div>
                <div className="text-sm font-semibold text-zinc-400 pb-2">Videos Rendered</div>
              </div>

              {/* Mock Bar Chart */}
              <div className="relative z-10 flex items-end gap-2 h-32 mt-4 border-b border-l border-zinc-800 pb-2 pl-2">
                <div className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-t-sm h-[20%] relative group/bar">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">12</div>
                </div>
                <div className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-t-sm h-[45%] relative group/bar">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">28</div>
                </div>
                <div className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-t-sm h-[30%] relative group/bar">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">18</div>
                </div>
                <div className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-t-sm h-[70%] relative group/bar">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">45</div>
                </div>
                <div className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-t-sm h-[85%] relative group/bar">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">58</div>
                </div>
                <div className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-t-sm h-[60%] relative group/bar">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">39</div>
                </div>
                <div className="flex-1 bg-emerald-500 hover:bg-emerald-400 transition-colors rounded-t-sm h-[100%] relative group/bar shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-400 opacity-100 transition-opacity">72</div>
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 px-2 uppercase tracking-wider">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span className="text-emerald-400">Sun</span>
              </div>
            </div>

            {/* Custom Niche 'Prompt Blueprints' Form */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
              <div className="border-b border-zinc-800 pb-4 flex justify-between items-center">
                <h2 className="text-lg font-bold text-zinc-50 flex items-center gap-2">
                  <LayoutTemplate className="w-5 h-5 text-indigo-400" />
                  Prompt Blueprints
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Niche Category</label>
                  <div className="relative">
                    <select className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors appearance-none">
                      <option>Technology & Coding</option>
                      <option>History & Lore</option>
                      <option>Geography & Travel</option>
                      <option>Finance & Crypto</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Core Topic</label>
                  <input className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors" placeholder="e.g., Python Web Scraping" type="text" />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">System Instructions</label>
                <textarea
                  rows={3}
                  value={blueprint?.systemPrompt ?? "You are an expert short-form video scriptwriter..."}
                  onChange={e => setBlueprint(b => ({ ...b, systemPrompt: e.target.value }))}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors resize-y min-h-[80px] font-mono text-xs"
                />
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-800">
                <span className="text-xs font-medium text-zinc-400">{bpMsg}</span>
                <button 
                  onClick={saveBlueprint}
                  disabled={bpSaving}
                  className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-semibold py-2 px-4 rounded-md transition-all flex items-center gap-2 text-xs"
                >
                  <Star className="w-4 h-4 text-amber-400" />
                  Save Blueprint
                </button>
              </div>
            </div>

            {/* Factory Operations */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
              <div className="border-b border-zinc-800 pb-4 flex justify-between items-center">
                <h2 className="text-lg font-bold text-zinc-50 flex items-center gap-2">
                  <Network className="w-5 h-5 text-rose-400" />
                  Automated Pipeline Engine
                </h2>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    {isFactoryActive ? "Active" : "Paused"}
                  </span>
                  <button 
                    onClick={toggleFactory}
                    className={`w-12 h-6 rounded-full relative transition-colors ${isFactoryActive ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isFactoryActive ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div className={`border rounded-lg p-4 transition-colors flex flex-col gap-2 ${isFactoryActive ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-zinc-950 border-zinc-800'}`}>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Content Engine</span>
                  <p className="text-sm font-medium text-zinc-400">Worker status: {isFactoryActive ? 'Running' : 'Sleeping'}</p>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <button className="bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-zinc-950 font-bold text-sm py-2 px-6 rounded-md transition-all flex items-center gap-2">
                  <Play className="w-4 h-4 fill-zinc-950" />
                  Force Render
                </button>
              </div>
            </div>

          </div>

          {/* Right Sidebar (Terminal) */}
          <div className="xl:col-span-4 h-full flex flex-col">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col h-[600px] overflow-hidden">
              <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Viral Telemetry</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-zinc-400 flex flex-col gap-1.5">
                <div className="text-emerald-400 opacity-70">ShortsFactory Pro v2.4.1 initialized...</div>
                <div className="text-emerald-400 opacity-70">Establishing secure connection to rendering farm.</div>
                <br />
                <div><span className="text-zinc-500">[10:28:01 AM]</span> <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-1">INFO</span> Checking quota: 142/500 remaining.</div>
                <div><span className="text-zinc-500">[10:28:05 AM]</span> <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-1">INFO</span> Loading blueprint: 'Python Scraper Basics'.</div>
                <div><span className="text-zinc-500">[10:30:12 AM]</span> <span className="bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-1">EXEC</span> Invoking Groq LPU for script generation...</div>
                <div className="pl-4 opacity-70">{">"} Latency: 42ms</div>
                <div className="pl-4 opacity-70">{">"} Tokens generated: 345</div>
                <div><span className="text-zinc-500">[10:30:14 AM]</span> <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-1">SUCCESS</span> Script generation complete.</div>
                <div><span className="text-zinc-500">[10:30:15 AM]</span> <span className="bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-1">EXEC</span> Initiating ElevenLabs TTS synthesis...</div>
                <div className="pl-4 opacity-70">{">"} Voice model: 'Rachel - Professional'</div>
                <div><span className="text-zinc-500">[10:30:22 AM]</span> <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-1">SUCCESS</span> Audio rendered (14s duration).</div>
                <div><span className="text-zinc-500">[10:30:25 AM]</span> <span className="bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-1">RENDER</span> Assembling visuals via FFmpeg...</div>
                <div className="pl-4 animate-pulse text-emerald-400">{">"} [==================  ] 85%</div>
                <div className="mt-auto pt-4 opacity-50 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-emerald-400 animate-pulse inline-block"></span>
                  Awaiting next command...
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
