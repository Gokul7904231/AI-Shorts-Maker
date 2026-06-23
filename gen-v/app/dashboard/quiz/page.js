"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Globe, 
  Settings2, 
  Sparkles, 
  HelpCircle, 
  Check, 
  Video, 
  Edit3, 
  ChevronDown, 
  AlertCircle,
  Clock,
  ExternalLink
} from "lucide-react";

/**
 * Structural TypeScript Definitions (Reference Schema)
 * 
 * interface GeoQuizDraft {
 *   quizId: string;
 *   country: string;
 *   voiceCode: string;
 *   flagUrl: string;
 *   hook: string;
 *   questions: Array<{
 *     question: string;
 *     options: [string, string, string, string];
 *     answerIndex: number;
 *     duration: number; // Defaults to 5s
 *   }>;
 *   gradingScale: string;
 *   status: "draft" | "queued" | "processing" | "completed" | "failed";
 *   createdAt: string;
 * }
 */

const VIRAL_COUNTRIES = [
  { name: "United States", code: "US", flag: "🇺🇸", voice: "en-US-ChristopherNeural" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", voice: "en-GB-RyanNeural" },
  { name: "India", code: "IN", flag: "🇮🇳", voice: "en-IN-PrabhatNeural" },
  { name: "Japan", code: "JP", flag: "🇯🇵", voice: "ja-JP-KeitaNeural" },
  { name: "Italy", code: "IT", flag: "🇮🇹", voice: "it-IT-GianniNeural" },
  { name: "Brazil", code: "BR", flag: "🇧🇷", voice: "pt-BR-AntonioNeural" },
  { name: "Germany", code: "DE", flag: "🇩🇪", voice: "de-DE-ConradNeural" },
];

const TONE_LEVELS = [
  { value: "challenging", label: "Challenging & Provocative", description: "Drives comment section arguments" },
  { value: "educational", label: "Educational & Informative", description: "Clean cultural trivia" },
  { value: "humorous", label: "Humorous & Witty", description: "Lighthearted regional banter" },
];

const QUIZ_FORMATS = [
  { value: "8_rapid", label: "6 Rapid Questions (Golden Strategy, 60s)", description: "Strict 1-minute high-retention format" },
  { value: "12_slow", label: "12 Slow Paced Questions (2 Min Video)", description: "Longer high-engagement format" }
];

export default function GeoQuizDashboard() {
  const [mounted, setMounted] = useState(false);

  // Form selections
  const [country, setCountry] = useState(VIRAL_COUNTRIES[0]);
  const [tone, setTone] = useState(TONE_LEVELS[0].value);
  const [format, setFormat] = useState(QUIZ_FORMATS[0].value);
  const [version, setVersion] = useState(1);

  // Custom Dropdown Open States
  const [countryOpen, setCountryOpen] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);

  // Generator State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Quiz Draft Payload State
  const [draft, setDraft] = useState(null);
  const [compiling, setCompiling] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleGenerateDraft = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    setDraft(null);

    try {
      const res = await fetch("/api/quiz/geo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: country.code,
          countryName: country.name,
          tone,
          format,
          voiceCode: country.voice,
          version: Number(version),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate draft");

      setDraft(data);
      setSuccess("Quiz draft generated successfully! Tweak the values below before compiling.");
    } catch (err) {
      setError(err.message ?? "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompileVideo = async () => {
    if (!draft) return;
    setCompiling(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/quiz/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: draft.quizId,
          theme: draft.country + " Identity Quiz",
          questions: draft.questions,
          hook: draft.hook,
          gradingScale: draft.gradingScale,
          voiceCode: draft.voiceCode,
          flagUrl: draft.flagUrl,
          country: draft.country,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to queue video compilation");

      setSuccess("Video queued for compilation! Track the progress in the Recent Renders tab.");
      setDraft((prev) => prev ? { ...prev, status: "queued" } : null);
    } catch (err) {
      setError(err.message ?? "An error occurred compiling.");
    } finally {
      setCompiling(false);
    }
  };

  const updateQuestionText = (index, value) => {
    setDraft((prev) => {
      if (!prev) return null;
      const updatedQuestions = [...prev.questions];
      updatedQuestions[index].question = value;
      return { ...prev, questions: updatedQuestions };
    });
  };

  const updateOptionText = (qIndex, oIndex, value) => {
    setDraft((prev) => {
      if (!prev) return null;
      const updatedQuestions = [...prev.questions];
      const updatedOptions = [...updatedQuestions[qIndex].options];
      updatedOptions[oIndex] = value;
      updatedQuestions[qIndex].options = updatedOptions;
      return { ...prev, questions: updatedQuestions };
    });
  };

  const updateAnswerIndex = (qIndex, oIndex) => {
    setDraft((prev) => {
      if (!prev) return null;
      const updatedQuestions = [...prev.questions];
      updatedQuestions[qIndex].answerIndex = oIndex;
      return { ...prev, questions: updatedQuestions };
    });
  };

  const updateDuration = (qIndex, value) => {
    setDraft((prev) => {
      if (!prev) return null;
      const updatedQuestions = [...prev.questions];
      updatedQuestions[qIndex].duration = Number(value);
      return { ...prev, questions: updatedQuestions };
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 py-12 px-6 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-6 h-6 text-purple-500 animate-pulse" />
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
                Geo-Identity Quiz Factory
              </h1>
            </div>
            <p className="text-zinc-400 text-sm mt-1">
              Create highly engaging, country-targeted YouTube Shorts trivia drafts instantly.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/recent-renders"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all flex items-center gap-1.5"
            >
              <span>Recent Renders</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all"
            >
              Back to Preview
            </Link>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Settings Panel (Left Column) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
              
              <div className="flex items-center gap-2 mb-6">
                <Settings2 className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-zinc-100">Quiz Configurations</h2>
              </div>

              {/* Country Selection Dropdown */}
              <div className="space-y-2 relative mb-6">
                <label className="text-sm font-semibold text-zinc-300">Target Country</label>
                <button
                  type="button"
                  onClick={() => setCountryOpen(!countryOpen)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between text-zinc-100 hover:border-zinc-700 transition-all focus:outline-none"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{country.flag}</span>
                    <span>{country.name} ({country.code})</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${countryOpen ? 'rotate-180' : ''}`} />
                </button>

                {countryOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {VIRAL_COUNTRIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCountry(c);
                          setCountryOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-all flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-lg">{c.flag}</span>
                          <span>{c.name}</span>
                        </span>
                        {country.code === c.code && <Check className="w-4 h-4 text-purple-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tone Selection Dropdown */}
              <div className="space-y-2 relative mb-6">
                <label className="text-sm font-semibold text-zinc-300">Engagement Tone</label>
                <button
                  type="button"
                  onClick={() => setToneOpen(!toneOpen)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between text-zinc-100 hover:border-zinc-700 transition-all focus:outline-none"
                >
                  <span>
                    {TONE_LEVELS.find((t) => t.value === tone)?.label}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${toneOpen ? 'rotate-180' : ''}`} />
                </button>

                {toneOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
                    {TONE_LEVELS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => {
                          setTone(t.value);
                          setToneOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-all flex flex-col gap-0.5"
                      >
                        <span className="text-sm font-semibold text-zinc-100 flex items-center justify-between">
                          {t.label}
                          {tone === t.value && <Check className="w-4 h-4 text-purple-400" />}
                        </span>
                        <span className="text-xs text-zinc-400">{t.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Format Selection Dropdown */}
              <div className="space-y-2 relative mb-8">
                <label className="text-sm font-semibold text-zinc-300">Quiz Format</label>
                <button
                  type="button"
                  onClick={() => setFormatOpen(!formatOpen)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between text-zinc-100 hover:border-zinc-700 transition-all focus:outline-none"
                >
                  <span>
                    {QUIZ_FORMATS.find((f) => f.value === format)?.label}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${formatOpen ? 'rotate-180' : ''}`} />
                </button>

                {formatOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
                    {QUIZ_FORMATS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => {
                          setFormat(f.value);
                          setFormatOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-all flex flex-col gap-0.5"
                      >
                        <span className="text-sm font-semibold text-zinc-100 flex items-center justify-between">
                          {f.label}
                          {format === f.value && <Check className="w-4 h-4 text-purple-400" />}
                        </span>
                        <span className="text-xs text-zinc-400">{f.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Batch / Version Number Selection */}
              <div className="space-y-2 mb-8">
                <label className="text-sm font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Batch / Version Number</span>
                  <span className="text-xs text-zinc-500">For creating unique variations</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:border-purple-500 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={version}
                  onChange={(e) => setVersion(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-all shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Generating Draft...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5" />
                    <span>Generate Draft</span>
                  </>
                )}
              </button>
            </div>

            {/* Dynamic System Message Feedback */}
            {error && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-200 text-sm flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-200 text-sm flex gap-2">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{success}</span>
              </div>
            )}
          </div>

          {/* Preview & Editor Card (Right Column) */}
          <div className="lg:col-span-7">
            {!draft ? (
              <div className="h-full min-h-[400px] bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
                <HelpCircle className="w-12 h-12 text-zinc-700 mb-4 animate-bounce" />
                <h3 className="font-bold text-zinc-300 text-lg">No Quiz Draft Loaded</h3>
                <p className="text-sm text-zinc-500 max-w-sm mt-1">
                  Configure the target country on the left and click &quot;Generate Draft&quot; to create your quiz structure instantly.
                </p>
              </div>
            ) : (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md shadow-xl relative">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{country.flag}</span>
                    <h3 className="font-bold text-zinc-100">{draft.country} Target Draft</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    draft.status === "queued" 
                      ? "bg-purple-950/60 border border-purple-800 text-purple-300"
                      : "bg-amber-950/60 border border-amber-800 text-amber-300"
                  }`}>
                    {draft.status}
                  </span>
                </div>

                {/* Editable Fields */}
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">Video Hook Narration</span>
                    <input
                      type="text"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:border-purple-500 focus:outline-none transition-all"
                      value={draft.hook}
                      onChange={(e) => setDraft({ ...draft, hook: e.target.value })}
                    />
                  </div>

                  {/* Questions Grid */}
                  <div className="space-y-4">
                    <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">Questions & Options</span>
                    
                    {draft.questions.map((q, qIndex) => (
                      <div key={qIndex} className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-bold text-zinc-500 uppercase">Question {qIndex + 1}</span>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            <input
                              type="number"
                              min="3"
                              max="15"
                              className="w-14 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-center text-xs text-zinc-300"
                              value={q.duration ?? 5}
                              onChange={(e) => updateDuration(qIndex, e.target.value)}
                            />
                            <span className="text-xs text-zinc-500">sec</span>
                          </div>
                        </div>

                        <input
                          type="text"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 focus:outline-none"
                          value={q.question}
                          onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                        />

                        {/* Options */}
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, oIndex) => {
                            const isCorrect = q.answerIndex === oIndex;
                            const optionLabel = ["A", "B", "C", "D"][oIndex];
                            return (
                              <div key={oIndex} className="relative flex items-center">
                                <input
                                  type="text"
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
                                  value={opt}
                                  onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateAnswerIndex(qIndex, oIndex)}
                                  className={`absolute left-2.5 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                    isCorrect 
                                      ? "bg-emerald-600 border-emerald-500 text-white" 
                                      : "border-zinc-700 hover:border-zinc-500"
                                  }`}
                                >
                                  {isCorrect && <Check className="w-2.5 h-2.5" />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">End Screen Grading Scale</span>
                    <input
                      type="text"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:border-purple-500 focus:outline-none transition-all"
                      value={draft.gradingScale}
                      onChange={(e) => setDraft({ ...draft, gradingScale: e.target.value })}
                    />
                  </div>

                  {/* Compile Trigger */}
                  <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                    <div className="text-xs text-zinc-500">
                      ID: {draft.quizId} | Voices: {draft.voiceCode}
                    </div>

                    <button
                      type="button"
                      onClick={handleCompileVideo}
                      disabled={compiling || draft.status === "queued"}
                      className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/40 text-white font-bold transition-all flex items-center gap-2 shadow-lg disabled:cursor-not-allowed"
                    >
                      {compiling ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Queuing Video...</span>
                        </>
                      ) : draft.status === "queued" ? (
                        <>
                          <Clock className="w-4 h-4" />
                          <span>Compilation Queued</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-4 h-4" />
                          <span>Compile Video Short</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
