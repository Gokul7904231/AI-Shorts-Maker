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
    <div style={{ minHeight: "100vh", background: "#09090b", fontFamily: "'Inter', sans-serif", color: "#e4e4e7" }}>
      {/* Header */}
      <header style={{
        background: "rgba(9,9,11,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(63,63,70,0.6)", padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/dashboard/quiz" style={{
            color: "#71717a", textDecoration: "none", fontSize: 13,
            padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(63,63,70,0.6)",
            transition: "all 0.2s",
          }}>← Dashboard</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>🎬</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Studio Library</div>
              <div style={{ fontSize: 11, color: "#52525b" }}>{total} videos in Cloudinary</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select
            value={prefix}
            onChange={e => setPrefix(e.target.value)}
            style={{
              background: "rgba(24,24,27,0.8)", border: "1px solid rgba(63,63,70,0.8)",
              borderRadius: 8, padding: "8px 12px", color: "#e4e4e7", fontSize: 13, cursor: "pointer",
            }}
          >
            <option value="geo_quiz_factory">📁 geo_quiz_factory/</option>
            <option value="ai_shorts">📁 ai_shorts/</option>
            <option value="ai_shorts/quizzes">📁 ai_shorts/quizzes/</option>
          </select>
          <button
            onClick={fetchVideos}
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none", borderRadius: 8, padding: "8px 16px",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px" }}>
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12, padding: "16px 20px", marginBottom: 24, color: "#f87171",
          }}>
            ⚠️ {error}
          </div>
        )}

        {loading && !videos.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                background: "rgba(24,24,27,0.6)", borderRadius: 16, overflow: "hidden",
                border: "1px solid rgba(63,63,70,0.6)", height: 280,
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#52525b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#71717a" }}>No videos found</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>Generate videos first, then they'll appear here</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {videos.map((v) => (
              <div
                key={v.publicId}
                style={{
                  background: "rgba(24,24,27,0.7)", backdropFilter: "blur(8px)",
                  border: selectedVideo?.publicId === v.publicId
                    ? "1px solid rgba(99,102,241,0.6)"
                    : "1px solid rgba(63,63,70,0.6)",
                  borderRadius: 16, overflow: "hidden", cursor: "pointer",
                  transition: "all 0.25s", transform: selectedVideo?.publicId === v.publicId ? "scale(1.02)" : "scale(1)",
                  boxShadow: selectedVideo?.publicId === v.publicId ? "0 8px 32px rgba(99,102,241,0.2)" : "none",
                }}
                onClick={() => setSelectedVideo(selectedVideo?.publicId === v.publicId ? null : v)}
                onMouseEnter={e => { if (selectedVideo?.publicId !== v.publicId) e.currentTarget.style.transform = "scale(1.01)"; }}
                onMouseLeave={e => { if (selectedVideo?.publicId !== v.publicId) e.currentTarget.style.transform = "scale(1)"; }}
              >
                {/* Video Preview */}
                <div style={{ position: "relative", paddingTop: "56.25%", background: "#18181b" }}>
                  <video
                    src={v.url}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    muted
                    onMouseEnter={e => e.target.play()}
                    onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
                  />
                  {v.duration && (
                    <div style={{
                      position: "absolute", bottom: 8, right: 8,
                      background: "rgba(0,0,0,0.7)", borderRadius: 6,
                      padding: "3px 8px", fontSize: 11, color: "#e4e4e7", fontWeight: 600,
                    }}>
                      {formatDuration(v.duration)}
                    </div>
                  )}
                </div>

                {/* Card Info */}
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7", marginBottom: 6, lineHeight: 1.4 }}>
                    {v.displayName}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: "#71717a", background: "rgba(39,39,42,0.8)", padding: "3px 8px", borderRadius: 20 }}>
                      {formatBytes(v.bytes)}
                    </span>
                    <span style={{ fontSize: 11, color: "#71717a", background: "rgba(39,39,42,0.8)", padding: "3px 8px", borderRadius: 20 }}>
                      {v.format?.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, color: "#71717a", background: "rgba(39,39,42,0.8)", padding: "3px 8px", borderRadius: 20 }}>
                      {formatDate(v.createdAt)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      onClick={e => e.stopPropagation()}
                      style={{
                        flex: 1, textAlign: "center", padding: "8px 12px", borderRadius: 8,
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none",
                        transition: "opacity 0.2s",
                      }}
                    >
                      ↓ Download
                    </a>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        padding: "8px 12px", borderRadius: 8,
                        border: "1px solid rgba(63,63,70,0.8)",
                        color: "#a1a1aa", fontSize: 12, fontWeight: 600, textDecoration: "none",
                      }}
                    >
                      ↗ Open
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
      `}</style>
    </div>
  );
}
