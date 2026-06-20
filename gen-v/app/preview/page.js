"use client";

import { useEffect, useState } from "react";

export default function PreviewPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialJobId = searchParams?.get("jobId") ?? "";

  const [reopenJobId, setReopenJobId] = useState(initialJobId);
  const [reopenManifest, setReopenManifest] = useState(null);

  useEffect(() => {
    if (!initialJobId) return;

    let cancelled = false;
    (async () => {
      try {
        // Use job manifest persistence only (no memory Map dependency).
        const res = await fetch(`/api/job-history/${encodeURIComponent(initialJobId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load job history");
        if (cancelled) return;
        setReopenJobId(initialJobId);
        setReopenManifest(json);
      } catch {
        if (cancelled) return;
        // Leave manifest empty; page will behave as normal preview.
        setReopenManifest(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJobId]);

  const [topic, setTopic] = useState("How to stay consistent");


  const [durationSeconds, setDurationSeconds] = useState(30);
  const [style, setStyle] = useState("Motivational");
  const [trend, setTrend] = useState("");
  const [provider, setProvider] = useState("gemini");
  const [contentType, setContentType] = useState("MOTIVATIONAL");
  const [quizData, setQuizData] = useState(null);

  const [scenes, setScenes] = useState(null);
  const [enhanced, setEnhanced] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState(null);

  const [contentHealth, setContentHealth] = useState(null);
  const [loadingStage, setLoadingStage] = useState("");



  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!videoStatus?.videoId) return;
    if (polling) return;

    let cancelled = false;
    const id = videoStatus.videoId;
    setPolling(true);

    const renderEngineUrl = process.env.NEXT_PUBLIC_RENDER_ENGINE_URL || "";
    const statusUrl = renderEngineUrl
      ? `${renderEngineUrl}/job-status/${id}`
      : `/api/job-status/${id}`;

    let delay = 2000;
    let timeoutId = null;

    async function tick() {
      if (cancelled) return;
      try {
        console.log(`[polling] Fetching job status from ${statusUrl} (delay: ${delay}ms)`);
        const res = await fetch(statusUrl);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to fetch job status");

        setVideoStatus((prev) => {
          // Avoid clobbering if user starts a new job.
          if (!prev?.videoId || prev.videoId !== id) return prev;
          return {
            videoId: id,
            status: json.status,
            output: json.output || (json.videoUrl ? {
              videoUrl: json.videoUrl,
              thumbnailUrl: json.thumbnailUrl,
              subtitlesUrl: json.subtitlesUrl,
            } : null),
          };
        });

        if (json.status === "completed" || json.status === "failed") {
          console.log(`[polling] Job ${id} finished with status: ${json.status}`);
          setPolling(false);
          return;
        }
      } catch (e) {
        console.error("[polling] error fetching job status:", e);
      }

      // Exponential backoff: 2s -> 3s -> 5s -> 5s
      if (delay === 2000) {
        delay = 3000;
      } else {
        delay = 5000;
      }

      if (!cancelled) {
        timeoutId = setTimeout(tick, delay);
      }
    }

    // Immediate tick.
    tick();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      setPolling(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoStatus?.videoId]);


  const [isEditingScript, setIsEditingScript] = useState(false);

  const [draftScript, setDraftScript] = useState("");
  const [script, setScript] = useState("");


  const [regeneratingSceneId, setRegeneratingSceneId] = useState(null);

  const [editingSceneId, setEditingSceneId] = useState(null);
  const [draftSceneText, setDraftSceneText] = useState("");
  const [draftSceneImagePrompt, setDraftSceneImagePrompt] = useState("");

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
      }
    });
  }, [reopenManifest]);

  async function generate() {
    setLoading(true);
    setError("");
    setEnhanced(null);
    try {

      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic,
          durationSeconds: Number(durationSeconds),
          style: style || undefined,
          trend: trend || undefined,
          provider,
          contentType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to generate");
      
      if (json.contentType === "QUIZ_SHORTS") {
        setQuizData(json);
        setScenes([]);
        setScript(json.hook);
        setDraftScript(json.hook);
      } else {
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
      setError(e?.message ?? "Failed to generate" );
    } finally {
      setLoading(false);
    }
  }


  async function enhance() {
    if (!scenes?.length) return;

    // Content health becomes stale after enhancement/regeneration.
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
        body: JSON.stringify({
          draft,
          provider,
        }),
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

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center py-10 px-6">

      <div className="w-full max-w-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Preview</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Generate a script + image prompts, then enhance the draft.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Topic</span>
            <input
              className="border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 bg-white dark:bg-black text-zinc-900 dark:text-zinc-50"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Duration (seconds)</span>
            <input
              type="number"
              className="border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 bg-white dark:bg-black text-zinc-900 dark:text-zinc-50"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Style</span>
            <input
              className="border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 bg-white dark:bg-black text-zinc-900 dark:text-zinc-50"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Trend (optional)</span>
            <input
              className="border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 bg-white dark:bg-black text-zinc-900 dark:text-zinc-50"
              value={trend}
              onChange={(e) => setTrend(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Provider</span>
            <select
              className="border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 bg-white dark:bg-black text-zinc-900 dark:text-zinc-50"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="gemini">gemini</option>
              <option value="groq">groq</option>
              <option value="openrouter">openrouter</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Content Type</span>
            <select
              className="border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 bg-white dark:bg-black text-zinc-900 dark:text-zinc-50"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
            >
              <option value="MOTIVATIONAL">Motivational</option>
              <option value="FACTS">Facts</option>
              <option value="STORY">Story</option>
              <option value="QUIZ_SHORTS">Quiz Shorts (New)</option>
            </select>
          </label>
        </div>

        {error ? (
          <div className="mt-4 p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="flex gap-3 mt-6">
          <button
            onClick={generate}
            disabled={loading}
            className="px-4 py-2 rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black disabled:opacity-60"
          >
            {loading ? "Working..." : contentType === "QUIZ_SHORTS" ? "Generate Quiz" : "Generate Script"}
          </button>

          <button
            onClick={enhance}
            disabled={loading || (!scenes?.length && !quizData)}
            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 disabled:opacity-60"
          >
            Enhance Draft
          </button>

          <button
            onClick={async () => {
              setGeneratingVideo(true);
              setVideoStatus(null);
              setError("");
              try {
                const payload = contentType === "QUIZ_SHORTS" ? {
                  topic,
                  style,
                  contentType,
                  hook: quizData?.hook,
                  questions: quizData?.questions,
                  title: quizData?.title,
                  description: quizData?.description,
                  hashtags: quizData?.hashtags,
                  renderProfile: "FAST_QUIZ",
                } : {
                  topic,
                  style,
                  script,
                  scenes,
                };

                const renderEngineUrl = process.env.NEXT_PUBLIC_RENDER_ENGINE_URL || "";
                const postUrl = renderEngineUrl
                  ? `${renderEngineUrl}/render-video`
                  : "/api/generate-video";

                console.log(`[generate] Posting video request to ${postUrl}`);
                const res = await fetch(postUrl, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(payload),
                });

                const json = await res.json();
                if (!res.ok) throw new Error(json?.error ?? "Video generation failed");

                setVideoStatus(json);
              } catch (e) {
                setError(e?.message ?? "Video generation failed");
              } finally {
                setGeneratingVideo(false);
              }
            }}
            disabled={generatingVideo || (!scenes?.length && !quizData)}
            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 disabled:opacity-60"
          >
            {generatingVideo ? "Generating video..." : "Generate Video"}
          </button>
        </div>


        {contentHealth ? (
          <div className="mt-6 p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
            <div className="font-semibold text-zinc-900 dark:text-zinc-50">Auto-optimized</div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-zinc-500 dark:text-zinc-400">Hook Score</div>
                <div
                  className={
                    contentHealth.hookScore >= 8
                      ? "text-emerald-700 dark:text-emerald-300"
                      : contentHealth.hookScore >= 6
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-red-700 dark:text-red-300"
                  }
                >
                  {contentHealth.hookScore}
                </div>
              </div>
              <div>
                <div className="text-zinc-500 dark:text-zinc-400">Scene Quality</div>
                <div
                  className={
                    contentHealth.sceneQualityScore >= 8
                      ? "text-emerald-700 dark:text-emerald-300"
                      : contentHealth.sceneQualityScore >= 6
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-red-700 dark:text-red-300"
                  }
                >
                  {contentHealth.sceneQualityScore}
                </div>
              </div>
              <div>
                <div className="text-zinc-500 dark:text-zinc-400">Topic Similarity</div>
                <div className="text-zinc-900 dark:text-zinc-50">
                  {contentHealth.topicSimilarity === undefined || contentHealth.topicSimilarity === null
                    ? "N/A"
                    : contentHealth.topicSimilarity < 0.75
                      ? "Low"
                      : "High"}
                </div>
              </div>
              <div>
                <div className="text-zinc-500 dark:text-zinc-400">Thumbnail Ready</div>
                <div className={contentHealth.thumbnailReady ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}>
                  {contentHealth.thumbnailReady ? "Yes" : "No"}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-zinc-500 dark:text-zinc-400">Metadata Title</div>
                <div className="text-zinc-900 dark:text-zinc-50">{contentHealth.metadataTitle ?? ""}</div>
              </div>
            </div>

            {contentHealth.warnings?.length ? (
              <div className="mt-3">
                <div className="text-zinc-500 dark:text-zinc-400 text-sm">Warnings</div>
                <ul className="list-disc pl-5 text-zinc-700 dark:text-zinc-300">
                  {contentHealth.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {contentHealth.errors?.length ? (
              <div className="mt-3">
                <div className="text-red-700 dark:text-red-300 text-sm">Errors</div>
                <ul className="list-disc pl-5 text-red-800 dark:text-red-200">
                  {contentHealth.errors.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 text-sm font-semibold">
              Status: {contentHealth.approved ? "Approved" : "Needs Improvement"}
            </div>
          </div>
        ) : null}

        {videoStatus?.videoId ? (
          <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            Video {"{"}
            {videoStatus.videoId}
            {"}"}: {videoStatus.status === "queued" ? "Queued..." : videoStatus.status === "processing" ? "Processing..." : videoStatus.status === "completed" ? "Completed" : "Failed"}
          </div>
        ) : null}

        {videoStatus?.status === "completed" && videoStatus?.output ? (
          <div className="mt-6 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Completed Job</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Render: {videoStatus.output.renderProfile ?? "N/A"}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                {videoStatus.output.thumbnailUrl ? (
                  <img
                    src={videoStatus.output.thumbnailUrl}
                    alt="thumbnail"
                    className="w-full rounded border border-zinc-200 dark:border-zinc-800"
                  />
                ) : (
                  <div className="w-full aspect-video rounded border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                    No thumbnail
                  </div>
                )}

                {videoStatus.output.videoUrl ? (
                  <div className="mt-3">
                    <video
                      controls
                      className="w-full rounded border border-zinc-200 dark:border-zinc-800"
                      src={videoStatus.output.videoUrl}
                    />
                  </div>
                ) : null}
              </div>

              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Render Info</div>
                    <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <div>Profile: {videoStatus.output.renderProfile ?? "N/A"}</div>
                      <div>FPS: {videoStatus.output.fps ?? "N/A"}</div>
                      <div>Resolution: {videoStatus.output.resolution ?? "N/A"}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Performance</div>
                    <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
                      {videoStatus.output.timings ? (
                        <>
                          {videoStatus.output.timings.step1_images_sec != null ? (
                            <div>Images: {videoStatus.output.timings.step1_images_sec}s</div>
                          ) : null}
                          {videoStatus.output.timings.step2_audio_sec != null ? (
                            <div>Audio: {videoStatus.output.timings.step2_audio_sec}s</div>
                          ) : null}
                          {videoStatus.output.timings.step3_subtitles_sec != null ? (
                            <div>Subtitles: {videoStatus.output.timings.step3_subtitles_sec}s</div>
                          ) : null}
                          {videoStatus.output.timings.step4_render_sec != null ? (
                            <div>Render: {videoStatus.output.timings.step4_render_sec}s</div>
                          ) : null}
                        </>
                      ) : (
                        <div>No timings</div>
                      )}

                      {videoStatus.output.cache ? (
                        <div>
                          Cache: {videoStatus.output.cache.hits ?? 0} hits / {videoStatus.output.cache.misses ?? 0} misses
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded border border-zinc-200 dark:border-zinc-800">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Downloads</div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {videoStatus.output.videoUrl ? (
                      <a
                        href={videoStatus.output.videoUrl}
                        download
                        className="px-3 py-2 rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black"
                      >
                        Download MP4
                      </a>
                    ) : null}
                    {videoStatus.output.thumbnailUrl ? (
                      <a
                        href={videoStatus.output.thumbnailUrl}
                        download
                        className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50"
                      >
                        Download Thumbnail
                      </a>
                    ) : null}
                    {videoStatus.output.subtitlesUrl ? (
                      <a
                        href={videoStatus.output.subtitlesUrl}
                        download
                        className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50"
                      >
                        Download Subtitles
                      </a>
                    ) : null}
                  </div>

                  {videoStatus.output.subtitlesUrl ? (
                    <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                      Subtitles: <a className="underline" href={videoStatus.output.subtitlesUrl}>open .srt</a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {contentType === "QUIZ_SHORTS" ? "Quiz Questions" : "Scenes"}
          </h2>

          {contentType === "QUIZ_SHORTS" ? (
            !quizData ? (
              <p className="text-zinc-600 dark:text-zinc-400">No quiz generated yet.</p>
            ) : (
              <div className="mt-3 space-y-4">
                <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg space-y-3">
                  <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Social Media Metadata</div>
                  <div>
                    <span className="text-xs text-zinc-400 font-bold uppercase">Title</span>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-50 mt-0.5">{quizData.title || "No title generated"}</div>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 font-bold uppercase">Description</span>
                    <div className="text-zinc-700 dark:text-zinc-300 text-sm mt-0.5">{quizData.description || "No description generated"}</div>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 font-bold uppercase">Hashtags</span>
                    <div className="text-zinc-700 dark:text-zinc-300 mt-1 flex flex-wrap gap-2">
                      {quizData.hashtags?.map((tag, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-xs font-semibold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg">
                  <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Hook Narration</div>
                  <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50 text-lg">"{quizData.hook}"</div>
                </div>
                
                <div className="space-y-3">
                  {quizData.questions?.map((q, idx) => (
                    <div key={idx} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden">
                      <span className={`absolute top-4 right-4 px-2 py-1 text-xs font-semibold rounded ${
                        q.difficulty === "easy" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" :
                        q.difficulty === "medium" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
                        "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}>
                        {q.difficulty.toUpperCase()}
                      </span>
                      
                      <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Question {idx + 1}</div>
                      <div className="mt-2 text-zinc-900 dark:text-zinc-50 font-medium text-lg pr-20">{q.question}</div>
                      
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {q.options?.map((opt, oIdx) => {
                          const isCorrect = opt === q.answer;
                          const letter = ["A", "B", "C"][oIdx];
                          return (
                            <div key={oIdx} className={`p-3 rounded border text-sm font-medium flex items-center justify-between ${
                              isCorrect 
                                ? "bg-emerald-50 border-emerald-300 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300" 
                                : "bg-zinc-50 border-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
                            }`}>
                              <span>{letter}. {opt}</span>
                              {isCorrect && (
                                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                </svg>
                              )}
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
            <p className="text-zinc-600 dark:text-zinc-400">No script yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Generated Script (editable)</div>
                  <div className="text-zinc-700 dark:text-zinc-200 text-sm">Edit via human-in-loop</div>
                </div>
                {!isEditingScript ? (
                  <button
                    onClick={() => {
                      setIsEditingScript(true);
                      setDraftScript(script);
                    }}
                    disabled={!scenes?.length}
                    className="px-3 py-2 rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black disabled:opacity-60"
                  >
                    Edit Script
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsEditingScript(false);
                        setDraftScript(script);
                      }}
                      className="px-3 py-2 rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setScript(draftScript);
                        setIsEditingScript(false);
                      }}
                      className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {isEditingScript ? (
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="w-full min-h-[140px] rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 p-3"
                />
              ) : null}

              {scenes.map((s, i) => {
                const sceneId = getSceneIdAt(i);
                return (
                  <div key={sceneId} className="border border-zinc-200 dark:border-zinc-800 rounded p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">Scene {i + 1}</div>
                      <div className="flex items-center gap-2">
                        {editingSceneId !== sceneId ? (
                          <button
                            onClick={() => beginEditScene(i)}
                            disabled={regeneratingSceneId !== null}
                            className="px-2 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black disabled:opacity-60"
                          >
                            Edit Scene
                          </button>
                        ) : null}
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
                                  topic,
                                  style,
                                  provider,
                                  sceneId,
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

                              setScenes((prevScenes) => {
                                if (!Array.isArray(prevScenes)) return prevScenes;
                                const updated = [...prevScenes];
                                const idx = updated.findIndex((scene) => (scene?.id ?? null) === sceneId);
                                if (idx === -1) return updated;
                                updated[idx] = {
                                  ...updated[idx],
                                  contactText: json.text,
                                  imagePrompt: json.imagePrompt,
                                };
                                return updated;
                              });
                            } catch (e) {
                              setError(e?.message ?? "Failed to regenerate scene");
                            } finally {
                              setRegeneratingSceneId(null);
                            }
                          }}
                          disabled={regeneratingSceneId !== null || editingSceneId === sceneId}
                          className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 disabled:opacity-60"
                        >
                          {regeneratingSceneId === sceneId ? "Regenerating..." : "Regenerate Scene"}
                        </button>
                      </div>
                    </div>

                    {editingSceneId === sceneId ? (
                      <div className="mt-3 space-y-3">
                        <label className="block">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">Text</div>
                          <textarea
                            value={draftSceneText}
                            onChange={(e) => setDraftSceneText(e.target.value)}
                            className="w-full min-h-[90px] rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 p-3"
                          />
                        </label>

                        <label className="block">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">Image Prompt</div>
                          <textarea
                            value={draftSceneImagePrompt}
                            onChange={(e) => setDraftSceneImagePrompt(e.target.value)}
                            className="w-full min-h-[120px] rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 p-3"
                          />
                        </label>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setScenes((prevScenes) => {
                                if (!Array.isArray(prevScenes)) return prevScenes;
                                const updated = [...prevScenes];
                                const idx = updated.findIndex((scene) => (scene?.id ?? null) === sceneId);
                                if (idx === -1) return updated;
                                updated[idx] = {
                                  ...updated[idx],
                                  contactText: draftSceneText,
                                  imagePrompt: draftSceneImagePrompt,
                                };
                                return updated;
                              });
                              setEditingSceneId(null);
                              setDraftSceneText("");
                              setDraftSceneImagePrompt("");
                            }}
                            className="px-3 py-2 rounded bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditScene}
                            className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-2 font-medium text-zinc-900 dark:text-zinc-50">{s.contactText}</div>
                        <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{s.imagePrompt}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>


        <div className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Enhanced Draft</h2>
          {!enhanced ? (
            <p className="text-zinc-600 dark:text-zinc-400">Enhancement will appear here.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Hook</div>
                <div className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">{enhanced.hook}</div>
              </div>

              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Script</div>
                <pre className="mt-1 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-3 text-zinc-900 dark:text-zinc-50">{enhanced.script}</pre>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Title</div>
                  <div className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">{enhanced.title}</div>
                </div>

                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Hashtags</div>
                  <div className="mt-1 text-zinc-700 dark:text-zinc-300">{enhanced.hashtags?.join(" ")}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Enhanced Scene Prompts</div>
                <div className="mt-2 space-y-2">
                  {enhanced.scenes?.map((s, idx) => (
                    <div key={s.id ?? idx} className="border border-zinc-200 dark:border-zinc-800 rounded p-3">
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">Scene {idx + 1}</div>
                      <div className="mt-2 font-medium text-zinc-900 dark:text-zinc-50">{s.text}</div>
                      <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{s.imagePrompt}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

