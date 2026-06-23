"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const GEO_COUNTRIES = [
  { code: "US", label: "🇺🇸 United States" },
  { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "IN", label: "🇮🇳 India" },
  { code: "JP", label: "🇯🇵 Japan" },
  { code: "IT", label: "🇮🇹 Italy" },
  { code: "BR", label: "🇧🇷 Brazil" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "AU", label: "🇦🇺 Australia" },
  { code: "MX", label: "🇲🇽 Mexico" },
  { code: "ES", label: "🇪🇸 Spain" },
  { code: "RU", label: "🇷🇺 Russia" },
  { code: "CN", label: "🇨🇳 China" },
  { code: "ZA", label: "🇿🇦 South Africa" },
  { code: "EG", label: "🇪🇬 Egypt" },
  { code: "SA", label: "🇸🇦 Saudi Arabia" },
  { code: "TR", label: "🇹🇷 Turkey" },
  { code: "AR", label: "🇦🇷 Argentina" },
  { code: "CO", label: "🇨🇴 Colombia" },
  { code: "PE", label: "🇵🇪 Peru" },
  { code: "CL", label: "🇨🇱 Chile" },
  { code: "VE", label: "🇻🇪 Venezuela" },
  { code: "SE", label: "🇸🇪 Sweden" },
  { code: "NO", label: "🇳🇴 Norway" },
  { code: "FI", label: "🇫🇮 Finland" },
  { code: "DK", label: "🇩🇰 Denmark" },
  { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "BE", label: "🇧🇪 Belgium" },
  { code: "CH", label: "🇨🇭 Switzerland" },
  { code: "AT", label: "🇦🇹 Austria" },
  { code: "PL", label: "🇵🇱 Poland" },
  { code: "GR", label: "🇬🇷 Greece" },
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "CZ", label: "🇨🇿 Czech Republic" },
  { code: "HU", label: "🇭🇺 Hungary" },
  { code: "RO", label: "🇷🇴 Romania" },
  { code: "UA", label: "🇺🇦 Ukraine" },
  { code: "IE", label: "🇮🇪 Ireland" },
  { code: "NZ", label: "🇳🇿 New Zealand" },
  { code: "KR", label: "🇰🇷 South Korea" },
  { code: "SG", label: "🇸🇬 Singapore" },
  { code: "MY", label: "🇲🇾 Malaysia" },
  { code: "TH", label: "🇹🇭 Thailand" },
  { code: "ID", label: "🇮🇩 Indonesia" },
  { code: "PH", label: "🇵🇭 Philippines" },
  { code: "VN", label: "🇻🇳 Vietnam" },
  { code: "PK", label: "🇵🇰 Pakistan" },
  { code: "BD", label: "🇧🇩 Bangladesh" },
  { code: "NG", label: "🇳🇬 Nigeria" }
];

export default function PreviewPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const initialJobId = searchParams?.get("jobId") ?? "";

  const [reopenJobId, setReopenJobId] = useState(initialJobId);
  const [reopenManifest, setReopenManifest] = useState(null);

  useEffect(() => {
    if (!initialJobId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/job-history/${encodeURIComponent(initialJobId)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load job history");
        if (cancelled) return;
        setReopenJobId(initialJobId);
        setReopenManifest(json);
      } catch {
        if (cancelled) return;
        setReopenManifest(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialJobId]);

  // Form state
  const [topic, setTopic] = useState("How to stay consistent");
  const [durationSeconds, setDurationSeconds] = useState(45);
  const [style, setStyle] = useState("Motivational");
  const [trend, setTrend] = useState("");
  const [provider, setProvider] = useState("groq");
  const [contentType, setContentType] = useState("QUIZ_SHORTS"); // default to Quiz
  const [quizCountry, setQuizCountry] = useState("US");
  const [quizFormat, setQuizFormat] = useState("3_rapid");
  const [quizData, setQuizData] = useState(null);
  const [mockMode, setMockMode] = useState(true); // default ON for testing

  const isQuiz = contentType === "QUIZ_SHORTS";

  // Script / scenes
  const [scenes, setScenes] = useState(null);
  const [enhanced, setEnhanced] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingStage, setLoadingStage] = useState("");

  // Video
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState(null);
  const [polling, setPolling] = useState(false);
  const [engineOnline, setEngineOnline] = useState(null); // null = unknown, true/false
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const pollingStartRef = useRef(null);
  const videoRef = useRef(null);

  const [contentHealth, setContentHealth] = useState(null);

  // Cloudinary manual upload
  const [cloudinaryUploading, setCloudinaryUploading] = useState(false);
  const [cloudinaryUploadResult, setCloudinaryUploadResult] = useState(null);
  const [cloudinaryUploadError, setCloudinaryUploadError] = useState("");

  // Feature 7: Viral Telemetry SSE terminal
  const [logLines, setLogLines] = useState([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const sseRef = useRef(null);

  // Quiz dynamic loading messages
  const [quizLoadingMessage, setQuizLoadingMessage] = useState("Invoking Groq LPU…");

  useEffect(() => {
    if (!loading || !isQuiz) return;
    const stages = [
      "Invoking Groq LPU…",
      "Auditing with YPP Mentor…",
      "Piping to render engine…",
      "Structuring scene visual directives…"
    ];
    let step = 0;
    setQuizLoadingMessage(stages[0]);
    const timer = setInterval(() => {
      step = (step + 1) % stages.length;
      setQuizLoadingMessage(stages[step]);
    }, 2500);
    return () => clearInterval(timer);
  }, [loading, isQuiz]);

  async function handleUploadToCloudinary() {
    if (!videoStatus?.videoId || cloudinaryUploading) return;
    setCloudinaryUploading(true);
    setCloudinaryUploadError("");
    setCloudinaryUploadResult(null);
    try {
      const res = await fetch("/api/cloudinary-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: videoStatus.videoId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Upload failed");
      setCloudinaryUploadResult(json);
    } catch (e) {
      setCloudinaryUploadError(e?.message ?? "Cloudinary upload failed");
    } finally {
      setCloudinaryUploading(false);
    }
  }

  // Script editing
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [draftScript, setDraftScript] = useState("");
  const [script, setScript] = useState("");
  const [regeneratingSceneId, setRegeneratingSceneId] = useState(null);
  const [editingSceneId, setEditingSceneId] = useState(null);
  const [draftSceneText, setDraftSceneText] = useState("");
  const [draftSceneImagePrompt, setDraftSceneImagePrompt] = useState("");

  const clampedDuration = Math.min(60, Math.max(30, Number(durationSeconds)));

  // Polling effect
  useEffect(() => {
    if (!videoStatus?.videoId) return;
    if (polling) return;

    let cancelled = false;
    const id = videoStatus.videoId;
    setPolling(true);
    setElapsedSeconds(0);
    pollingStartRef.current = Date.now();

    const statusUrl = `/api/job-status/${id}`;
    let delay = 3000;
    let timeoutId = null;
    let elapsedTimerId = null;

    elapsedTimerId = setInterval(() => {
      if (cancelled) return;
      const secs = Math.floor((Date.now() - pollingStartRef.current) / 1000);
      setElapsedSeconds(secs);
    }, 1000);

    async function tick() {
      if (cancelled) return;
      try {
        const res = await fetch(statusUrl);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to fetch job status");

        setVideoStatus((prev) => {
          if (!prev?.videoId || prev.videoId !== id) return prev;
          return {
            videoId: id,
            status: json.status,
            output: json.output || (json.videoUrl
              ? { videoUrl: json.videoUrl, thumbnailUrl: json.thumbnailUrl, subtitlesUrl: json.subtitlesUrl }
              : null),
          };
        });

        if (json.status === "completed" || json.status === "failed") {
          clearInterval(elapsedTimerId);
          setPolling(false);
          return;
        }
      } catch (e) {
        console.error("[polling] error:", e);
      }

      const elapsed = Date.now() - pollingStartRef.current;
      delay = elapsed < 60_000 ? 3000 : 5000;
      if (!cancelled) timeoutId = setTimeout(tick, delay);
    }

    tick();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (elapsedTimerId) clearInterval(elapsedTimerId);
      setPolling(false);
    };
  }, [videoStatus?.videoId]);

  // Engine health check
  useEffect(() => {
    const isActive = videoStatus?.status === "queued" || videoStatus?.status === "processing";
    if (!isActive) return;

    let cancelled = false;
    async function checkEngine() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/render-engine-health");
        const json = await res.json();
        if (!cancelled) setEngineOnline(json.online === true);
      } catch {
        if (!cancelled) setEngineOnline(false);
      }
    }
    checkEngine();
    const id = setInterval(checkEngine, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [videoStatus?.status]);

  // Feature 7: SSE log stream — open while render is active
  useEffect(() => {
    const isActive = videoStatus?.status === "queued" || videoStatus?.status === "processing";
    if (!isActive) {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      return;
    }
    if (sseRef.current) return; // already connected
    setLogLines([]);
    setShowTerminal(true);
    const es = new EventSource("/api/logs/proxy");
    sseRef.current = es;
    es.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data);
        if (d.ping) return;
        if (d.msg) {
          setLogLines((prev) => [...prev.slice(-199), d.msg]);
        }
      } catch {}
    };
    es.onerror = () => {
      es.close();
      sseRef.current = null;
    };
    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [videoStatus?.status]);

  async function retriggerJob() {
    if (!videoStatus?.videoId || retrying) return;
    setRetrying(true);
    try {
      const res = await fetch("/api/render-engine-health", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: videoStatus.videoId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to re-trigger");
    } catch (e) {
      console.error("[retrigger]", e);
    } finally {
      setRetrying(false);
    }
  }

  // Reopen manifest
  useEffect(() => {
    if (!reopenManifest) return;
    setTopic(reopenManifest.topic || "");
    if (reopenManifest.contentType === "QUIZ_SHORTS") {
      setContentType("QUIZ_SHORTS");
      setQuizData({
        hook: reopenManifest.quizData?.hook || reopenManifest.script || "",
        questions: reopenManifest.quizData?.questions || [],
        title: reopenManifest.quizData?.title || "",
        description: reopenManifest.quizData?.description || "",
        hashtags: reopenManifest.quizData?.hashtags || [],
      });
      setScenes([]);
      setScript(reopenManifest.script || "");
    } else {
      setContentType(reopenManifest.contentType || "MOTIVATIONAL");
      setScenes(reopenManifest.scenes || []);
      setScript(reopenManifest.script || "");
      setQuizData(null);
    }
    setVideoStatus({
      videoId: reopenManifest.jobId,
      status: reopenManifest.status,
      output: {
        videoUrl: reopenManifest.videoUrl,
        thumbnailUrl: reopenManifest.thumbnailUrl,
        subtitlesUrl: reopenManifest.subtitlesUrl,
        renderProfile: reopenManifest.renderProfile,
        fps: reopenManifest.fps,
        resolution: reopenManifest.resolution,
        timings: reopenManifest.timings,
        cache: reopenManifest.cache,
      },
    });
  }, [reopenManifest]);

  function getSceneIdAt(index) {
    const s = scenes?.[index];
    return s?.id ?? index;
  }

  function beginEditScene(index) {
    const s = scenes?.[index];
    const sceneId = s?.id ?? index;
    setEditingSceneId(sceneId);
    setDraftSceneText(s?.contactText ?? "");
    setDraftSceneImagePrompt(s?.imagePrompt ?? "");
  }

  function cancelEditScene() {
    setEditingSceneId(null);
    setDraftSceneText("");
    setDraftSceneImagePrompt("");
  }

  async function generate() {
    setLoading(true);
    setError("");
    setEnhanced(null);
    setLoadingStage(isQuiz ? "Generating geo-quiz…" : "Generating script…");

    try {
      let res, json;

      if (isQuiz) {
        const endpoint = mockMode ? "/api/quiz/mock" : "/api/quiz/geo";
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ countryCode: quizCountry, tone: "challenging", format: quizFormat, version: 1 }),
        });
        json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to generate geo-quiz");

        setQuizData({
          hook: json.hook,
          questions: (json.questions || []).map((q) => ({
            question: q.question,
            options: q.options,
            answer: q.options[q.answerIndex ?? 0],
            answerIndex: q.answerIndex ?? 0,
            difficulty: "medium",
          })),
          title: `${GEO_COUNTRIES.find((c) => c.code === quizCountry)?.label ?? quizCountry} Quiz`,
          description: `How well do you know ${GEO_COUNTRIES.find((c) => c.code === quizCountry)?.label ?? quizCountry}? Take the challenge!`,
          hashtags: ["quiz", "geoquiz", quizCountry.toLowerCase(), "shorts"],
          flagUrl: `https://flagcdn.com/w1280/${quizCountry.toLowerCase()}.png`,
        });
        setScenes([]);
        setScript(json.hook);
        setDraftScript(json.hook);
      } else {
        res = await fetch("/api/generate-script", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            topic,
            durationSeconds: clampedDuration,
            style: style || undefined,
            trend: trend || undefined,
            provider,
            contentType,
            faster: true,
          }),
        });
        json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to generate");

        setQuizData(null);
        setScenes(json.scenes);
        const initialScript = Array.isArray(json?.scenes)
          ? json.scenes.map((s) => s?.contactText ?? "").join("\n")
          : "";
        setDraftScript(initialScript);
        setScript(initialScript);
      }

      setIsEditingScript(false);
      setEnhanced(null);
    } catch (e) {
      setError(e?.message ?? "Failed to generate");
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  }

  async function enhance() {
    if (!scenes?.length) return;
    setContentHealth(null);
    const draft = scenes
      .map((s, idx) => `Scene ${idx + 1}: ${s.contactText}\nImage: ${s.imagePrompt}`)
      .join("\n\n");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/enhance-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft, provider }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to enhance");
      setEnhanced(json.enhanced ?? null);
    } catch (e) {
      setError(e?.message ?? "Failed to enhance");
    } finally {
      setLoading(false);
    }
  }

  async function generateVideo() {
    setGeneratingVideo(true);
    setVideoStatus(null);
    setError("");
    try {
      const payload =
        isQuiz
          ? {
              topic: `${GEO_COUNTRIES.find((c) => c.code === quizCountry)?.label ?? quizCountry} Geo Quiz`,
              style: "quiz",
              contentType: "QUIZ_SHORTS",
              hook: quizData?.hook,
              questions: quizData?.questions,
              title: quizData?.title,
              description: quizData?.description,
              hashtags: quizData?.hashtags,
              renderProfile: "FAST_QUIZ",
              durationSeconds: clampedDuration,
            }
          : {
              topic,
              style,
              script,
              scenes,
              durationSeconds: clampedDuration,
            };

      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Video generation failed");
      setVideoStatus({
        videoId: json.jobId || json.videoId,
        status: json.status,
      });

      setTimeout(() => {
        document.getElementById("video-output-section")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } catch (e) {
      setError(e?.message ?? "Video generation failed");
    } finally {
      setGeneratingVideo(false);
    }
  }

  if (!mounted) return null;

  const videoCompleted =
    videoStatus?.status === "completed" && videoStatus?.output?.videoUrl;
  const videoProcessing =
    videoStatus?.status === "queued" || videoStatus?.status === "processing";

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 max-w-4xl mx-auto flex flex-col justify-between fade-in-up">
      {/* ── Header Card ── */}
      <div className="glass-card p-6 md:p-8 mb-6 relative overflow-hidden">
        {/* Decorative Background Gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center text-xl font-bold shadow-lg shadow-violet-500/20">
              ✦
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gradient-violet">
                Quiz Factory
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Generate and render high-retention automated YouTube Shorts
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className="btn btn-ghost text-xs py-2 px-4 border border-zinc-800/80 hover:border-violet-500/35 transition-all self-start md:self-auto"
          >
            ⚙ Admin Controls
          </Link>
        </div>

        {/* ── Form Config Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-zinc-800/40">
          
          {/* Topic (Hide for quiz) */}
          {!isQuiz && (
            <div className="flex flex-col gap-1.5">
              <label className="field-label">Topic</label>
              <input
                className="input-field"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. How to stay consistent"
              />
            </div>
          )}

          {/* Duration (Hide for quiz, derived from format) */}
          {!isQuiz && (
            <div className="flex flex-col gap-1.5">
              <label className="field-label">Duration (30–60 s)</label>
              <input
                type="number"
                min={30}
                max={60}
                className="input-field"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
              />
            </div>
          )}

          {/* Style (Hide for quiz) */}
          {!isQuiz && (
            <div className="flex flex-col gap-1.5">
              <label className="field-label">Style</label>
              <input
                className="input-field"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="e.g. Motivational"
              />
            </div>
          )}

          {/* Trend (Hide for quiz) */}
          {!isQuiz && (
            <div className="flex flex-col gap-1.5">
              <label className="field-label">Trend (optional)</label>
              <input
                className="input-field"
                value={trend}
                onChange={(e) => setTrend(e.target.value)}
                placeholder="e.g. sigma mindset"
              />
            </div>
          )}

          {/* Provider */}
          <div className="flex flex-col gap-1.5">
            <label className="field-label">AI Model Provider</label>
            <select
              className="select-field"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="gemini">Gemini</option>
              <option value="groq">Groq LPU (Recommended)</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>

          {/* Content Type */}
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Content Type</label>
            <select
              className="select-field"
              value={contentType}
              onChange={(e) => {
                setContentType(e.target.value);
                setScenes(null);
                setQuizData(null);
                setVideoStatus(null);
              }}
            >
              <option value="QUIZ_SHORTS">🌍 Geo Quiz Shorts (Interactive)</option>
              <option value="MOTIVATIONAL">Motivational</option>
              <option value="FACTS">Facts</option>
              <option value="STORY">Story</option>
            </select>
          </div>

          {/* Mock Mode Toggle — Quiz Only */}
          {isQuiz && (
            <div
              className={`col-span-full flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                mockMode
                  ? "bg-amber-500/5 border-amber-500/30 text-amber-200"
                  : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400"
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <span className={`text-xs font-bold ${mockMode ? "text-amber-400" : "text-zinc-300"}`}>
                  🧪 Mock Mode {mockMode ? "Active" : "Disabled"}
                </span>
                <span className="text-[10px] text-zinc-500 leading-normal max-w-sm">
                  {mockMode
                    ? "Generates using pre-set country flags/questions instantly (no API quota used)"
                    : "Invokes real-time Groq and YPP policy mentors for custom generation"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {mockMode && <span className="badge badge-amber text-[9px] py-0.5 px-2">SANDBOX</span>}
                <div
                  onClick={() => setMockMode((m) => !m)}
                  className={`toggle-track ${mockMode ? "active" : ""}`}
                >
                  <div className="toggle-thumb" />
                </div>
              </div>
            </div>
          )}

          {/* Country Selection — Quiz Only */}
          {isQuiz && (
            <div className="flex flex-col gap-1.5 col-span-full">
              <label className="field-label field-label-accent">🌍 Select Quiz Country</label>
              <select
                className="select-field quiz-select"
                value={quizCountry}
                onChange={(e) => setQuizCountry(e.target.value)}
              >
                {GEO_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Format (Questions Count) — Quiz Only */}
          {isQuiz && (
            <div className="flex flex-col gap-1.5 col-span-full">
              <label className="field-label field-label-accent">⚡ Quiz format / length</label>
              <select
                className="select-field quiz-select"
                value={quizFormat}
                onChange={(e) => {
                  setQuizFormat(e.target.value);
                  setQuizData(null);
                  setVideoStatus(null);
                }}
              >
                <option value="8_rapid">1 Min Video (6 Rapid Questions)</option>
                <option value="12_slow">2 Min Video (12 Slow Paced Questions)</option>
              </select>
            </div>
          )}
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Form Actions ── */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-zinc-800/40">
          <button
            onClick={generate}
            disabled={loading}
            className="btn btn-violet flex-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" />
                {isQuiz ? quizLoadingMessage : loadingStage || "Working…"}
              </span>
            ) : isQuiz ? (
              "🌍 Generate Geo-Quiz Script"
            ) : (
              "✦ Generate Script"
            )}
          </button>

          {!isQuiz && (
            <button
              onClick={enhance}
              disabled={loading || !scenes?.length}
              className="btn btn-ghost"
            >
              Enhance Draft
            </button>
          )}

          <button
            onClick={generateVideo}
            disabled={generatingVideo || (!scenes?.length && !quizData)}
            className="btn btn-emerald flex-1"
          >
            {generatingVideo ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" /> Spawning Video Engine…
              </span>
            ) : (
              "▶ Render Video"
            )}
          </button>
        </div>
      </div>

      {/* ── VIDEO OUTPUT AREA ── */}
      <div id="video-output-section" className="w-full mb-6">
        
        {/* Processing / Telemetry Panel */}
        {videoProcessing && (
          <div className="glass-card p-6 md:p-8 flex flex-col items-center gap-6 glow-violet text-center">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="spinner-ring-outer" />
              <div className="spinner-ring-inner" />
              <div className="text-2xl">🎬</div>
            </div>

            <div className="w-full">
              <h3 className="text-lg font-extrabold text-zinc-100 mb-1">
                {videoStatus?.status === "queued" ? "Video is Queued" : "Rendering Assets"}
              </h3>
              <p className="text-xs text-zinc-500 font-mono mb-6">
                Job ID: <span className="text-violet-400">{videoStatus?.videoId}</span>
              </p>

              {/* Counter telemetries */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                <div className="text-center border-r border-zinc-800/60">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Elapsed Time</div>
                  <div className="text-lg font-black text-zinc-200 font-mono mt-1">
                    {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-violet-400 uppercase tracking-wider">Est. Remaining</div>
                  <div className="text-lg font-black text-violet-300 font-mono mt-1">
                    {(() => {
                      const est = (isQuiz ? 45 : 90) - elapsedSeconds;
                      return est > 0 ? `${est}s` : "Soon...";
                    })()}
                  </div>
                </div>
              </div>

              {/* Progress Steps Checklist */}
              <div className="step-list text-left max-w-md mx-auto mb-6">
                <div className="step-item done">
                  <span className="font-bold">✅</span>
                  <div className="flex-1 flex justify-between items-center">
                    <span className="font-semibold text-zinc-200">1. Script & YPP Mentor Check</span>
                    <span className="text-[10px] uppercase font-bold text-emerald-400">Passed</span>
                  </div>
                </div>

                <div className={`step-item ${videoStatus?.status === "processing" || videoCompleted ? "done" : "active"}`}>
                  <span className="font-bold">{videoStatus?.status === "processing" || videoCompleted ? "✅" : "⏳"}</span>
                  <div className="flex-1 flex justify-between items-center">
                    <span className="font-semibold">2. Audio & Subtitles Engine</span>
                    <span className="text-[10px] uppercase font-bold text-zinc-500">
                      {videoStatus?.status === "processing" || videoCompleted ? "Done" : "Spawning"}
                    </span>
                  </div>
                </div>

                <div className={`step-item ${videoCompleted ? "done" : videoStatus?.status === "processing" ? "active" : "pending"}`}>
                  <span className="font-bold">{videoCompleted ? "✅" : videoStatus?.status === "processing" ? "⏳" : "⬜"}</span>
                  <div className="flex-1 flex justify-between items-center">
                    <span className="font-semibold">3. FFmpeg Kinetic Framing</span>
                    <span className="text-[10px] uppercase font-bold text-zinc-500">
                      {videoCompleted ? "Done" : videoStatus?.status === "processing" ? "Compiling" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Engine health */}
              <div className="flex justify-center mb-6">
                {engineOnline === null && (
                  <span className="badge badge-violet">🔍 Interrogating render engine...</span>
                )}
                {engineOnline === true && (
                  <span className="badge badge-emerald">🟢 Render engine online</span>
                )}
                {engineOnline === false && (
                  <span className="badge badge-red">⚠️ Render engine offline — restart start_worker.py</span>
                )}
              </div>
            </div>

            {/* Retrigger Stuck Button */}
            {engineOnline !== false && elapsedSeconds > 30 && (
              <button
                onClick={retriggerJob}
                disabled={retrying}
                className="btn btn-ghost-violet text-xs py-1.5 px-4 mb-2"
              >
                {retrying ? "Piping re-trigger command…" : "↺ Re-trigger stuck render process"}
              </button>
            )}

          <div className="progress-track">
              <div
                className="shimmer-bar-purple h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, (elapsedSeconds / (isQuiz ? 45 : 90)) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Feature 7: Viral Telemetry Terminal */}
        {showTerminal && (
          <div className="glass-card mt-4 overflow-hidden border border-zinc-800/60">
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", borderBottom: "1px solid rgba(63,63,70,0.6)",
                background: "rgba(9,9,11,0.8)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: logLines.length ? "#10b981" : "#52525b", display: "inline-block" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a1a1aa", fontFamily: "monospace" }}>
                  Worker Terminal ({logLines.length} lines)
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setLogLines([])}
                  style={{ fontSize: 11, color: "#52525b", background: "none", border: "none", cursor: "pointer" }}
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowTerminal(false)}
                  style={{ fontSize: 11, color: "#52525b", background: "none", border: "none", cursor: "pointer" }}
                >
                  ✕ Hide
                </button>
              </div>
            </div>
            <div
              id="terminal-scroll"
              style={{
                height: 220, overflowY: "auto", padding: "12px 16px",
                background: "rgba(5,5,8,0.95)", fontFamily: "monospace", fontSize: 11,
                display: "flex", flexDirection: "column", gap: 2,
              }}
              ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
            >
              {logLines.length === 0 ? (
                <span style={{ color: "#3f3f46" }}>Waiting for worker logs…</span>
              ) : (
                logLines.map((line, i) => (
                  <span key={i} style={{
                    color: line.includes("[ERROR]") || line.includes("Error") ? "#f87171"
                      : line.includes("[PERF") ? "#a78bfa"
                      : line.includes("[FFmpeg]") || line.includes("[Cloudinary]") ? "#34d399"
                      : "#71717a",
                    lineHeight: 1.5,
                  }}>
                    {line}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {!showTerminal && videoStatus && (videoStatus.status === "queued" || videoStatus.status === "processing") && (
          <button
            onClick={() => setShowTerminal(true)}
            style={{
              marginTop: 8, fontSize: 11, color: "#52525b", background: "none",
              border: "1px solid rgba(63,63,70,0.4)", borderRadius: 6, padding: "4px 12px",
              cursor: "pointer", fontFamily: "monospace",
            }}
          >
            ▶ Show Worker Terminal
          </button>
        )}

        {/* Failed Panel */}
        {videoStatus?.status === "failed" && (

          <div className="glass-card p-6 flex items-center gap-4 border border-red-500/30 bg-red-500/5">
            <span className="text-2xl">❌</span>
            <div>
              <h3 className="font-bold text-red-300">Video Compile Failure</h3>
              <p className="text-xs text-zinc-400 mt-1">
                The Python rendering backend returned an execution error. Review terminal logs for details.
              </p>
            </div>
          </div>
        )}

        {/* Success / Finished Player Panel */}
        {videoCompleted && (
          <div className="glass-card overflow-hidden glow-violet border border-violet-500/30 fade-in-up">
            
            {/* Success Header */}
            <div className="p-5 flex items-center justify-between border-b border-zinc-800/40 bg-zinc-900/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 glow-emerald" />
                <span className="font-bold text-zinc-200">Video Ready for Distribution</span>
              </div>
              <span className="badge badge-violet uppercase text-[10px]">
                {videoStatus.output.renderProfile ?? "SHORTS"}
              </span>
            </div>

            {/* Video preview container (9:16 vertical styling) */}
            <div className="flex justify-center p-6 bg-zinc-950/40">
              <div className="relative w-full max-w-[260px] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/80 bg-black">
                <video
                  ref={videoRef}
                  controls
                  className="w-full aspect-[9/16] object-cover"
                  src={videoStatus.output.videoUrl}
                  poster={videoStatus.output.thumbnailUrl || undefined}
                />
              </div>
            </div>

            {/* Download/Distribution buttons */}
            <div className="p-6 flex flex-col gap-4 border-t border-zinc-800/40">
              <div className="flex flex-wrap gap-2 justify-center">
                {videoStatus.output.videoUrl && (
                  <a
                    href={videoStatus.output.videoUrl}
                    download
                    className="btn btn-violet text-xs py-2 px-4"
                  >
                    ⬇ Download MP4
                  </a>
                )}
                {videoStatus.output.thumbnailUrl && (
                  <a
                    href={videoStatus.output.thumbnailUrl}
                    download
                    className="btn btn-ghost text-xs py-2 px-4"
                  >
                    🖼 Thumbnail
                  </a>
                )}
                {videoStatus.output.subtitlesUrl && (
                  <a
                    href={videoStatus.output.subtitlesUrl}
                    download
                    className="btn btn-ghost text-xs py-2 px-4"
                  >
                    📝 Captions (SRT)
                  </a>
                )}
                {videoStatus.output.videoUrl && (
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play();
                      }
                    }}
                    className="btn btn-ghost-violet text-xs py-2 px-4"
                  >
                    ▶ Replay Video
                  </button>
                )}
              </div>

              {/* Save to Cloudinary integration */}
              <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800/40 bg-zinc-950/20 rounded-xl p-4 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-300">Cloud Storage Backup</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Archive this short to Cloudinary storage bucket</p>
                  </div>
                  
                  {cloudinaryUploadResult ? (
                    <a
                      href={cloudinaryUploadResult.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-cyan text-xs py-2 px-4"
                    >
                      ✅ View on Cloudinary
                    </a>
                  ) : (
                    <button
                      id="cloudinary-upload-btn"
                      onClick={handleUploadToCloudinary}
                      disabled={cloudinaryUploading}
                      className="btn btn-cyan text-xs py-2 px-4"
                    >
                      {cloudinaryUploading ? (
                        <>
                          <span className="spinner mr-1" />
                          Uploading...
                        </>
                      ) : (
                        "☁ Save to Cloudinary"
                      )}
                    </button>
                  )}
                </div>

                {cloudinaryUploadError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                    ⚠️ {cloudinaryUploadError}
                  </div>
                )}

                {cloudinaryUploadResult && (
                  <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/15 text-[11px] text-cyan-400 space-y-1 font-mono">
                    <div className="font-bold text-zinc-300 mb-1">Archived Path:</div>
                    <div className="truncate">Public ID: {cloudinaryUploadResult.publicId}</div>
                    <div className="truncate">Folder: {cloudinaryUploadResult.folder}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Performance telemetry footer */}
            <div className="p-4 bg-zinc-950/60 flex flex-wrap justify-between items-center gap-4 text-[11px] text-zinc-500 border-t border-zinc-800/40 font-mono">
              <div>Profile: <span className="text-zinc-300">{videoStatus.output.renderProfile ?? "N/A"}</span></div>
              <div>FPS: <span className="text-zinc-300">{videoStatus.output.fps ?? "N/A"}</span></div>
              <div>Resolution: <span className="text-zinc-300">{videoStatus.output.resolution ?? "N/A"}</span></div>
              {videoStatus.output.timings?.step4_render_sec != null && (
                <div>Render time: <span className="text-zinc-300">{videoStatus.output.timings.step4_render_sec}s</span></div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Quiz Details / Narrations ── */}
      <div className="glass-card p-6 md:p-8 mb-6">
        <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
          {isQuiz ? "🌍 Geo-Quiz Script Narrative" : "📝 Scene Draft Narratives"}
        </h2>

        {isQuiz ? (
          !quizData ? (
            <p className="text-sm text-zinc-500 leading-normal">
              Select a country from the settings above and click Generate to preview the story hook, questions, and YPP visual directives.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* Hook Card */}
              <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-600/5 relative overflow-hidden">
                <span className="field-label field-label-accent mb-2">Narration Hook</span>
                <p className="text-base font-bold text-zinc-100 italic leading-relaxed">
                  &ldquo;{quizData.hook}&rdquo;
                </p>
              </div>

              {/* Social Metadata Card */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-4">
                <span className="field-label mb-0">Video Metadata (YPP Optimized)</span>
                
                <div className="grid grid-cols-1 gap-3 pt-2">
                  <div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Title</div>
                    <div className="text-sm font-semibold text-zinc-200">{quizData.title || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Description</div>
                    <div className="text-xs text-zinc-400 leading-relaxed">{quizData.description || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Hashtags</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {quizData.hashtags?.map((tag, i) => (
                        <span key={i} className="badge badge-violet text-[10px] py-0.5 px-2">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4 pt-2">
                <span className="field-label mb-2">Quiz Questions</span>
                {quizData.questions?.map((q, idx) => (
                  <div
                    key={idx}
                    className="glass-card p-5 relative overflow-hidden transition-all duration-300 hover:scale-[1.01]"
                  >
                    <span
                      className={`absolute top-4 right-4 badge ${
                        q.difficulty === "easy"
                          ? "badge-emerald"
                          : q.difficulty === "hard"
                          ? "badge-red"
                          : "badge-amber"
                      }`}
                    >
                      {(q.difficulty ?? "medium").toUpperCase()}
                    </span>

                    <span className="field-label">Question {idx + 1}</span>
                    <h3 className="text-base font-bold text-zinc-100 pr-16 mb-4">
                      {q.question}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {q.options?.map((opt, oIdx) => {
                        const isCorrect = opt === q.answer || oIdx === q.answerIndex;
                        const letter = ["A", "B", "C", "D"][oIdx];
                        return (
                          <div
                            key={oIdx}
                            className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs md:text-sm font-semibold transition-all ${
                              isCorrect
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                : "border-zinc-800 bg-zinc-900/40 text-zinc-400"
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                isCorrect
                                  ? "bg-emerald-500 text-black"
                                  : "bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              {letter}
                            </span>
                            <span>{opt}</span>
                            {isCorrect && <span className="ml-auto text-emerald-400">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : !scenes ? (
          <p className="text-sm text-zinc-500 leading-normal">
            No scene script has been generated yet. Set topic above and click Generate.
          </p>
        ) : (
          <div className="space-y-4">
            
            {/* Script Text Editor */}
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-xs text-zinc-400 font-semibold">Scene Script Editor</span>
              {!isEditingScript ? (
                <button
                  onClick={() => { setIsEditingScript(true); setDraftScript(script); }}
                  disabled={!scenes?.length}
                  className="btn btn-ghost py-1.5 px-3 text-xs"
                >
                  Edit Script
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsEditingScript(false); setDraftScript(script); }}
                    className="btn btn-violet py-1.5 px-3 text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setScript(draftScript); setIsEditingScript(false); }}
                    className="btn btn-ghost py-1.5 px-3 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {isEditingScript && (
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="input-field min-h-[140px] font-mono text-xs leading-normal"
              />
            )}

            {/* Render Scene Cards */}
            <div className="space-y-4">
              {scenes.map((s, i) => {
                const sceneId = getSceneIdAt(i);
                return (
                  <div
                    key={sceneId}
                    className="glass-card p-5 transition-all duration-300 hover:scale-[1.01]"
                  >
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <span className="field-label mb-0">Scene {i + 1}</span>
                      <div className="flex gap-2">
                        {editingSceneId !== sceneId && (
                          <button
                            onClick={() => beginEditScene(i)}
                            disabled={regeneratingSceneId !== null}
                            className="btn btn-ghost py-1 px-3 text-xs"
                          >
                            ✏️ Edit
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            setError("");
                            setRegeneratingSceneId(sceneId);
                            try {
                              const previous = scenes?.[i - 1];
                              const next = scenes?.[i + 1];
                              const res = await fetch("/api/regenerate-scene", {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({
                                  topic, style, provider, sceneId,
                                  currentScene: s.contactText,
                                  currentImagePrompt: s.imagePrompt,
                                  previousScene: previous?.contactText ?? "",
                                  previousImagePrompt: previous?.imagePrompt ?? "",
                                  nextScene: next?.contactText ?? "",
                                  nextImagePrompt: next?.imagePrompt ?? "",
                                }),
                              });
                              const json = await res.json();
                              if (!res.ok) throw new Error(json?.error ?? "Failed to regenerate scene");
                              setScenes((prev) => {
                                if (!Array.isArray(prev)) return prev;
                                const updated = [...prev];
                                const idx = updated.findIndex((sc) => (sc?.id ?? null) === sceneId);
                                if (idx === -1) return updated;
                                updated[idx] = { ...updated[idx], contactText: json.text, imagePrompt: json.imagePrompt };
                                return updated;
                              });
                            } catch (e) {
                              setError(e?.message ?? "Failed to regenerate scene");
                            } finally {
                              setRegeneratingSceneId(null);
                            }
                          }}
                          disabled={regeneratingSceneId !== null || editingSceneId === sceneId}
                          className="btn btn-ghost py-1 px-3 text-xs"
                        >
                          {regeneratingSceneId === sceneId ? "⏳ Regen..." : "🔄 Regen"}
                        </button>
                      </div>
                    </div>

                    {editingSceneId === sceneId ? (
                      <div className="flex flex-col gap-3">
                        <textarea
                          value={draftSceneText}
                          onChange={(e) => setDraftSceneText(e.target.value)}
                          className="input-field min-h-[70px] resize-y"
                          placeholder="Scene narration text"
                        />
                        <textarea
                          value={draftSceneImagePrompt}
                          onChange={(e) => setDraftSceneImagePrompt(e.target.value)}
                          className="input-field min-h-[70px] resize-y text-xs text-zinc-400 font-mono"
                          placeholder="Scene visual prompt"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setScenes((prev) => {
                                if (!Array.isArray(prev)) return prev;
                                const updated = [...prev];
                                const idx = updated.findIndex((sc) => (sc?.id ?? null) === sceneId);
                                if (idx === -1) return updated;
                                updated[idx] = { ...updated[idx], contactText: draftSceneText, imagePrompt: draftSceneImagePrompt };
                                return updated;
                              });
                              cancelEditScene();
                            }}
                            className="btn btn-violet py-1.5 px-3 text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditScene}
                            className="btn btn-ghost py-1.5 px-3 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-zinc-100 font-medium leading-relaxed">{s.contactText}</p>
                        <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-900/60 text-xs text-zinc-400 italic font-mono leading-normal">
                          <span className="text-[10px] text-zinc-600 block uppercase font-bold tracking-wider not-italic mb-1 font-sans">Visual Prompt</span>
                          {s.imagePrompt}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Enhanced Draft section ── */}
      {enhanced && (
        <div className="glass-card p-6 md:p-8">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">✨ Enhanced Draft Summary</h2>
          <div className="space-y-4">
            <div>
              <span className="field-label">Narration Hook</span>
              <p className="text-sm font-semibold text-zinc-200">{enhanced.hook}</p>
            </div>
            <div>
              <span className="field-label">Full Narrative script</span>
              <pre className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-900/80 text-xs text-zinc-400 leading-normal font-mono whitespace-pre-wrap">
                {enhanced.script}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
