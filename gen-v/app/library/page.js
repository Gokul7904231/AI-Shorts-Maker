"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

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

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function LibraryPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prefix, setPrefix] = useState("geo_quiz_factory");
  const [selectedVideo, setSelectedVideo] = useState(null);
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
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      {/* ── Top Header (Light Mode) ── */}
      <header className="sticky top-0 z-40 w-full h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-r border-zinc-200 pr-6 h-8">
             <span className="font-bold text-lg tracking-tight">Studio Library</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={prefix}
            onChange={e => setPrefix(e.target.value)}
            className="bg-zinc-100 border border-zinc-300 rounded px-3 py-1.5 text-xs font-semibold text-zinc-700 outline-none"
          >
            <option value="geo_quiz_factory">geo_quiz_factory/</option>
            <option value="ai_shorts">ai_shorts/</option>
            <option value="ai_shorts/quizzes">ai_shorts/quizzes/</option>
          </select>
          <button
            onClick={fetchVideos}
            disabled={loading}
            className="bg-zinc-900 hover:bg-black text-white px-4 py-1.5 rounded text-xs font-semibold transition-colors"
          >
            {loading ? "..." : "Refresh"}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Studio Library</h1>
          <p className="text-sm text-zinc-500">Showing generated media in {prefix}...</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded mb-6 text-sm">
            ⚠️ {error}
          </div>
        )}

        {loading && !videos.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-zinc-100 border border-zinc-200 rounded-xl h-[260px] animate-pulse"></div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <div className="text-4xl mb-4">📭</div>
            <div className="text-lg font-semibold text-zinc-800">No videos found</div>
            <div className="text-sm mt-2">Generate videos first, then they'll appear here</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map((v) => (
              <div
                key={v.publicId}
                className="bg-[#1c1f26] border border-[#2a2d35] rounded-xl overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer shadow-md"
                onClick={() => setSelectedVideo(selectedVideo?.publicId === v.publicId ? null : v)}
              >
                {/* Video Preview */}
                <div className="relative pt-[56.25%] bg-[#111317]">
                  <video
                    src={v.url}
                    className="absolute inset-0 w-full h-full object-cover"
                    muted
                    onMouseEnter={e => e.target.play()}
                    onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
                  />
                  {v.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur rounded px-1.5 py-0.5 text-[10px] text-white font-semibold">
                      {formatDuration(v.duration)}
                    </div>
                  )}
                </div>

                {/* Card Info */}
                <div className="p-4">
                  <div className="text-sm font-semibold text-white mb-2 line-clamp-1">
                    {v.displayName || "Generated Output"}
                  </div>
                  <div className="flex gap-2 flex-wrap mb-4">
                    <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded">
                      {formatBytes(v.bytes)}
                    </span>
                    <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded">
                      {v.format?.toUpperCase() || "MP4"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      onClick={e => e.stopPropagation()}
                      className="flex-1 text-center py-2 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
