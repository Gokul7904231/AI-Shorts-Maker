"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { 
  Globe2, 
  Settings2, 
  ExternalLink, 
  ArrowLeft, 
  Sparkles, 
  Play, 
  Download, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  FileVideo,
  FileText
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";

const GEO_COUNTRIES = [
  { code: "US", label: "🇺🇸 United States (US)" },
  { code: "GB", label: "🇬🇧 United Kingdom (UK)" },
  { code: "IN", label: "🇮🇳 India (IN)" },
  { code: "JP", label: "🇯🇵 Japan (JP)" },
  { code: "IT", label: "🇮🇹 Italy (IT)" },
  { code: "BR", label: "🇧🇷 Brazil (BR)" },
  { code: "DE", label: "🇩🇪 Germany (DE)" },
  { code: "FR", label: "🇫🇷 France (FR)" },
  { code: "CA", label: "🇨🇦 Canada (CA)" },
  { code: "AU", label: "🇦🇺 Australia (AU)" },
];

export default function GeoQuizFactory() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [quizCountry, setQuizCountry] = useState("US");
  const [engagementTone, setEngagementTone] = useState("Challenging & Provocative");
  const [quizFormat, setQuizFormat] = useState("6_rapid");
  const [batchNumber, setBatchNumber] = useState("1");
  const [mockMode, setMockMode] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quizData, setQuizData] = useState(null);

  // Video Rendering State
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState(null);
  const [polling, setPolling] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const pollingStartRef = useRef(null);
  const videoRef = useRef(null);

  async function generateDraft() {
    setLoading(true);
    setError("");
    setVideoStatus(null);
    try {
      const endpoint = mockMode ? "/api/quiz/mock" : "/api/quiz/geo";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          countryCode: quizCountry, 
          tone: engagementTone, 
          format: quizFormat, 
          version: parseInt(batchNumber) || 1 
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to generate geo-quiz draft");

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
      });
    } catch (e) {
      setError(e?.message ?? "Failed to generate draft");
    } finally {
      setLoading(false);
    }
  }

  async function renderVideo() {
    setGeneratingVideo(true);
    setVideoStatus(null);
    setError("");
    try {
      const payload = {
        topic: `${GEO_COUNTRIES.find((c) => c.code === quizCountry)?.label ?? quizCountry} Geo Quiz`,
        style: "quiz",
        contentType: "QUIZ_SHORTS",
        hook: quizData?.hook,
        questions: quizData?.questions,
        title: quizData?.title,
        description: quizData?.description,
        hashtags: quizData?.hashtags,
        renderProfile: "FAST_QUIZ",
        durationSeconds: 45,
      };

      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Video generation failed");
      setVideoStatus({ videoId: json.jobId || json.videoId, status: json.status });
    } catch (e) {
      setError(e?.message ?? "Video generation failed");
    } finally {
      setGeneratingVideo(false);
    }
  }

  // Polling
  useEffect(() => {
    if (!videoStatus?.videoId) return;
    if (polling) return;

    let cancelled = false;
    const id = videoStatus.videoId;
    setPolling(true);
    setElapsedSeconds(0);
    pollingStartRef.current = Date.now();

    const elapsedTimerId = setInterval(() => {
      if (cancelled) return;
      setElapsedSeconds(Math.floor((Date.now() - pollingStartRef.current) / 1000));
    }, 1000);

    async function tick() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/job-status/${id}`);
        const json = await res.json();
        if (res.ok) {
          setVideoStatus(prev => {
            if (!prev?.videoId || prev.videoId !== id) return prev;
            return {
              videoId: id,
              status: json.status,
              output: json.output || (json.videoUrl ? { videoUrl: json.videoUrl, thumbnailUrl: json.thumbnailUrl } : null),
            };
          });
          if (json.status === "completed" || json.status === "failed") {
            clearInterval(elapsedTimerId);
            setPolling(false);
            return;
          }
        }
      } catch (e) {}
      if (!cancelled) setTimeout(tick, elapsedSeconds < 60 ? 3000 : 5000);
    }
    tick();
    return () => { cancelled = true; clearInterval(elapsedTimerId); setPolling(false); };
  }, [videoStatus?.videoId]);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50 font-body-base">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen z-0 max-h-screen overflow-y-auto">
        <TopNav title="Geo-Identity Quiz Factory" />
        
        <main className="w-full max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-800">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50 flex items-center gap-3">
                <Globe2 className="w-6 h-6 text-emerald-400" />
                Geo-Identity Quiz Factory
              </h1>
              <p className="text-sm font-medium text-zinc-400 mt-2">
                Create highly engaging, country-targeted YouTube Shorts trivia drafts instantly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/library" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold py-2 px-4 rounded-md transition-all flex items-center gap-2">
                Recent Renders <ExternalLink className="w-3 h-3" />
              </Link>
              <button className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold py-2 px-4 rounded-md transition-all flex items-center gap-2">
                Back to Preview <ArrowLeft className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Config */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/50">
                  <Settings2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-zinc-50 tracking-tight">Quiz Configurations</h2>
                </div>
                
                <div className="p-6 flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Target Country</label>
                    <select
                      value={quizCountry}
                      onChange={(e) => setQuizCountry(e.target.value)}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                    >
                      {GEO_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Engagement Tone</label>
                    <select
                      value={engagementTone}
                      onChange={(e) => setEngagementTone(e.target.value)}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                    >
                      <option value="Challenging & Provocative">Challenging & Provocative</option>
                      <option value="Educational & Direct">Educational & Direct</option>
                      <option value="Fun & Energetic">Fun & Energetic</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Quiz Format</label>
                    <select
                      value={quizFormat}
                      onChange={(e) => setQuizFormat(e.target.value)}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                    >
                      <option value="6_rapid">6 Rapid Questions (Golden Strategy, 60s)</option>
                      <option value="12_slow">12 Slow Paced Questions (120s)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Batch / Version Number</label>
                      <span className="text-[10px] text-zinc-500">For creating unique variations</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-md bg-zinc-950 border border-zinc-800">
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">Sandbox Mock Mode</div>
                      <div className="text-[10px] text-zinc-500 mt-1">Instant generation, no API quota.</div>
                    </div>
                    <button 
                      onClick={() => setMockMode(!mockMode)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${mockMode ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${mockMode ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>

                  <button
                    onClick={generateDraft}
                    disabled={loading}
                    className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-zinc-950 font-bold text-sm py-3 rounded-md flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"/> Generating...</span>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Generate Draft</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Viewer */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <p className="text-sm font-medium text-rose-400 leading-relaxed">{error}</p>
                </div>
              )}

              {!quizData && !loading ? (
                <div className="h-full min-h-[500px] bg-zinc-900/50 border border-zinc-800/80 rounded-xl border-dashed flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                    <HelpCircle className="w-8 h-8 text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-200 tracking-tight">No Quiz Draft Loaded</h3>
                  <p className="text-sm text-zinc-500 mt-2 max-w-sm leading-relaxed">
                    Configure the target country on the left and click "Generate Draft" to create your quiz structure instantly.
                  </p>
                </div>
              ) : quizData ? (
                <div className="flex flex-col gap-6">
                  
                  {/* Hook Display */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Opening Hook
                    </div>
                    <p className="text-lg font-semibold text-zinc-100 leading-relaxed italic border-l-4 border-emerald-500/50 pl-4">
                      "{quizData.hook}"
                    </p>
                  </div>

                  {/* Questions Grid */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Quiz Flow ({quizData.questions.length} Questions)
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {quizData.questions.map((q, idx) => (
                        <div key={idx} className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-4">
                          <div className="text-xs font-bold text-zinc-500 mb-2">Q{idx + 1}</div>
                          <h4 className="text-sm font-semibold text-zinc-100 mb-3">{q.question}</h4>
                          <div className="flex flex-col gap-2">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === q.answerIndex;
                              return (
                                <div key={oIdx} className={`px-3 py-2 rounded text-xs font-medium border ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                                  {["A", "B", "C", "D"][oIdx]}. {opt}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Render Controls */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-100">Ready to Render</h4>
                      <p className="text-xs text-zinc-500 mt-1">This will spawn a VPS background worker to render via FFmpeg.</p>
                    </div>
                    
                    <button
                      onClick={renderVideo}
                      disabled={generatingVideo || videoStatus?.status === "processing"}
                      className="bg-zinc-50 hover:bg-zinc-200 active:scale-[0.98] transition-all text-zinc-950 font-bold text-sm py-2 px-6 rounded-md flex items-center justify-center gap-2 shrink-0"
                    >
                      {generatingVideo ? (
                        <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"/> Spawning...</span>
                      ) : (
                        <><Play className="w-4 h-4 fill-zinc-950" /> Render Video Pipeline</>
                      )}
                    </button>
                  </div>

                  {/* Telemetry Panel */}
                  {(videoStatus?.status === "processing" || videoStatus?.status === "queued" || videoStatus?.status === "completed") && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Render Telemetry
                        </div>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${videoStatus.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {videoStatus.status}
                        </div>
                      </div>
                      
                      {videoStatus.status !== "completed" ? (
                        <div className="flex flex-col items-center justify-center p-8 border border-zinc-800/80 rounded-lg bg-zinc-950">
                          <div className="w-12 h-12 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin mb-4" />
                          <div className="text-sm font-bold text-zinc-200">Assembling via FFmpeg</div>
                          <div className="text-xs text-zinc-500 font-mono mt-1">Job: {videoStatus.videoId}</div>
                          <div className="w-full max-w-md bg-zinc-800 rounded-full h-1.5 mt-6 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (elapsedSeconds / 45) * 100)}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row gap-6 items-center p-6 border border-emerald-500/20 rounded-lg bg-emerald-500/5">
                          {videoStatus.output?.videoUrl && (
                            <div className="w-48 shrink-0 rounded-lg overflow-hidden border border-zinc-800 bg-black aspect-[9/16]">
                              <video src={videoStatus.output.videoUrl} controls className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex flex-col gap-4 w-full">
                            <h4 className="text-lg font-bold text-zinc-100">Render Complete</h4>
                            <div className="flex gap-3">
                              {videoStatus.output?.videoUrl && (
                                <a href={videoStatus.output.videoUrl} download className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2 border border-zinc-700">
                                  <Download className="w-3 h-3" /> MP4 Video
                                </a>
                              )}
                              {videoStatus.output?.subtitlesUrl && (
                                <a href={videoStatus.output.subtitlesUrl} download className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2 border border-zinc-700">
                                  <FileText className="w-3 h-3" /> Subtitles
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
