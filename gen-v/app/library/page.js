"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";

function formatBytes(bytes) {
  if (!bytes) return "—";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDuration(s) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function LibraryPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prefix, setPrefix] = useState("geo_quiz_factory");
  const [total, setTotal] = useState(0);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/library?prefix=${encodeURIComponent(prefix)}&max=20`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load library");
      setVideos(data.videos ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [prefix]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen bg-glow z-0">
        <TopNav title="ShortsFactory Pro" />

        <main className="flex-1 p-md md:p-xl md:pl-lg w-full max-w-container-max mx-auto overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-lg gap-md">
            <div>
              <h2 className="text-headline-md font-headline-md text-on-surface">Studio Library</h2>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-base">Manage and download your generated assets.</p>
            </div>
            {/* Filters/Actions */}
            <div className="flex gap-sm items-center">
              <select
                value={prefix}
                onChange={e => setPrefix(e.target.value)}
                className="bg-surface-container border border-outline-variant rounded px-3 py-1.5 text-xs font-label-mono text-on-surface outline-none focus:border-primary"
              >
                <option value="geo_quiz_factory">geo_quiz_factory/</option>
                <option value="ai_shorts">ai_shorts/</option>
                <option value="ai_shorts/quizzes">ai_shorts/quizzes/</option>
              </select>
              <button 
                onClick={fetchVideos}
                disabled={loading}
                className="flex items-center gap-sm px-sm py-1.5 bg-surface-container rounded border border-outline-variant text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>sync</span>
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container border border-error p-4 rounded mb-6 text-sm font-body-base">
              ⚠️ {error}
            </div>
          )}

          {/* Video Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-lg">
            {loading && !videos.length ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="group bg-surface-container-low/50 backdrop-blur-xl border border-outline-variant/50 rounded-xl overflow-hidden flex flex-col animate-pulse h-[260px]">
                  <div className="relative aspect-video w-full overflow-hidden bg-surface-container-highest"></div>
                  <div className="p-md flex flex-col flex-1 opacity-70">
                    <div className="h-4 bg-surface-container-highest rounded w-3/4 mb-xs"></div>
                    <div className="h-3 bg-surface-container-highest rounded w-1/2 mb-md"></div>
                  </div>
                </div>
              ))
            ) : videos.length === 0 ? (
              <div className="col-span-full text-center py-20 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-4 opacity-50">movie</span>
                <div className="text-lg font-bold text-on-surface">No videos found</div>
                <div className="text-sm mt-2">Change your filter or generate some videos first.</div>
              </div>
            ) : (
              videos.map((v) => (
                <div key={v.publicId} className="group bg-surface-container-low/50 backdrop-blur-xl border border-outline-variant/50 rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-[0_0_15px_rgba(78,222,163,0.1)] transition-all duration-300 flex flex-col">
                  <div className="relative aspect-video w-full overflow-hidden bg-surface-container-highest">
                    <video
                      src={v.url}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      muted
                      onMouseEnter={e => e.target.play()}
                      onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                      <span className="material-symbols-outlined text-on-surface text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                    </div>
                    {v.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-label-mono font-label-mono text-xs text-on-surface">
                        {formatDuration(v.duration)}
                      </div>
                    )}
                  </div>
                  <div className="p-md flex flex-col flex-1">
                    <h3 className="text-body-base font-body-base font-bold text-on-surface truncate mb-xs">{v.displayName || "Generated Output"}</h3>
                    <p className="text-label-mono font-label-mono text-on-surface-variant text-xs mb-md">Size: {formatBytes(v.bytes)} • {v.format?.toUpperCase()}</p>
                    <div className="mt-auto">
                      <a 
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="w-full flex items-center justify-center gap-sm bg-surface-container border border-outline-variant hover:bg-surface-container-highest hover:border-primary/30 text-on-surface py-sm rounded-lg transition-colors text-body-sm font-body-base"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        Download MP4
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </>
  );
}
