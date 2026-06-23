import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";

function getFlagUrl(j: any): string {
  if (j.quizData?.flagUrl) return j.quizData.flagUrl;
  if (j.flagUrl) return j.flagUrl;
  if (j.countryCode) return `https://flagcdn.com/w1280/${j.countryCode.toLowerCase()}.png`;

  // Try to extract country code from flag emoji in topic or title
  const searchString = `${j.topic ?? ""} ${j.title ?? ""} ${j.quizData?.title ?? ""}`;
  const emojiMatch = searchString.match(/\uD83C([\uDDE6-\uDDFF])\uD83C([\uDDE6-\uDDFF])/);
  if (emojiMatch) {
    const code1 = String.fromCharCode(emojiMatch[1].charCodeAt(0) - 0xDDE6 + 65);
    const code2 = String.fromCharCode(emojiMatch[2].charCodeAt(0) - 0xDDE6 + 65);
    return `https://flagcdn.com/w1280/${(code1 + code2).toLowerCase()}.png`;
  }

  // Try to extract country code from country name lookup
  const countryName = (j.country ?? j.quizData?.country ?? "").toLowerCase().trim();
  const countryLookup: Record<string, string> = {
    "united states": "us", "usa": "us", "united kingdom": "gb", "uk": "gb",
    "india": "in", "japan": "jp", "italy": "it", "brazil": "br", "germany": "de",
    "france": "fr", "canada": "ca", "australia": "au", "mexico": "mx", "spain": "es",
    "russia": "ru", "china": "cn", "south africa": "za", "egypt": "eg", "saudi arabia": "sa",
    "turkey": "tr", "argentina": "ar", "colombia": "co", "peru": "pe", "chile": "cl",
    "venezuela": "ve", "sweden": "se", "norway": "no", "finland": "fi", "denmark": "dk",
    "netherlands": "nl", "belgium": "be", "switzerland": "ch", "austria": "at",
    "poland": "pl", "greece": "gr", "portugal": "pt", "czech republic": "cz",
    "hungary": "hu", "romania": "ro", "ukraine": "ua", "ireland": "ie", "new zealand": "nz",
    "south korea": "kr", "korea": "kr", "singapore": "sg", "malaysia": "my", "thailand": "th",
    "indonesia": "id", "philippines": "ph", "vietnam": "vn", "pakistan": "pk",
    "bangladesh": "bd", "nigeria": "ng"
  };
  if (countryLookup[countryName]) {
    return `https://flagcdn.com/w1280/${countryLookup[countryName]}.png`;
  }

  // Try to extract country name from topic (e.g. "Thailand Geo Quiz")
  const topicLower = (j.topic ?? "").toLowerCase();
  for (const [name, code] of Object.entries(countryLookup)) {
    if (topicLower.includes(name)) {
      return `https://flagcdn.com/w1280/${code}.png`;
    }
  }

  return "";
}

/**
 * GET  /api/render-engine-health
 * Returns whether the Python rendering engine at NEXT_PUBLIC_RENDER_ENGINE_URL is reachable.
 *
 * POST /api/render-engine-health  { jobId }
 * Re-triggers a queued job by POSTing it to the render engine.
 * Used by the UI when the user manually retries a stuck job.
 */

export async function GET() {
  const renderEngineUrl = process.env.NEXT_PUBLIC_RENDER_ENGINE_URL;
  if (!renderEngineUrl) {
    return NextResponse.json({ online: false, reason: "NEXT_PUBLIC_RENDER_ENGINE_URL not configured" });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000); // 5s timeout
    const res = await fetch(`${renderEngineUrl}/docs`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return NextResponse.json({ online: res.ok, status: res.status });
  } catch (err: any) {
    return NextResponse.json({ online: false, reason: err?.message ?? "unreachable" });
  }
}

export async function POST(req: Request) {
  const renderEngineUrl = process.env.NEXT_PUBLIC_RENDER_ENGINE_URL;
  if (!renderEngineUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_RENDER_ENGINE_URL not configured" }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { jobId } = body;
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  // Fetch the full job payload from Firestore (jobs are stored in "videos" collection)
  try {
    const doc = await db.collection("videos").doc(jobId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: `Job ${jobId} not found in Firestore` }, { status: 404 });
    }
    const j: any = doc.data() ?? {};

    const finalFlagUrl = getFlagUrl(j);
    const countryCodeMatch = finalFlagUrl.match(/\/w1280\/([a-z]{2})\.png/i);
    const computedCountryCode = countryCodeMatch ? countryCodeMatch[1].toUpperCase() : (j.countryCode ?? "");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    // Dynamic Visual Overhaul adjustments: ensure we pass branding configurations,
    // country tags for flags, and clean up historical properties.
    const res = await fetch(`${renderEngineUrl}/render-video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_SECRET_KEY}`,
      },
      body: JSON.stringify({
        jobId,
        topic: j.topic ?? j.quizData?.title ?? "Quiz",
        style: j.style ?? "INTERMEDIATE",
        contentType: j.contentType ?? "Geo Quiz Shorts (Interactive)",
        countryCode: computedCountryCode,
        questions: j.quizData?.questions ?? j.questions ?? [],
        script: j.script ?? j.quizData?.hook ?? "",
        hook: j.quizData?.hook ?? j.script ?? "",
        flagUrl: finalFlagUrl,
        voiceCode: j.quizData?.voiceCode ?? j.voiceCode ?? "",
        gradingScale: j.quizData?.gradingScale ?? j.gradingScale ?? "",
        country: j.quizData?.country ?? j.country ?? "",
        quizData: j.quizData ?? (j.quizData || j.contentType === "QUIZ_SHORTS" ? {
          hook: j.quizData?.hook ?? j.script ?? "",
          questions: j.quizData?.questions ?? j.questions ?? [],
          title: j.quizData?.title ?? j.topic ?? "",
          description: j.quizData?.description ?? "",
          hashtags: j.quizData?.hashtags ?? [],
          flagUrl: finalFlagUrl,
          voiceCode: j.quizData?.voiceCode ?? j.voiceCode ?? "",
          gradingScale: j.quizData?.gradingScale ?? j.gradingScale ?? "",
          country: j.quizData?.country ?? j.country ?? "",
        } : null),

        // Pass down white-label branding configurations to feed FFmpeg's filter_complex scripts
        brandConfig: {
          fontColor: j.brandConfig?.fontColor ?? "#4EDEA3",
          boxColor: j.brandConfig?.boxColor ?? "#18181B",
          fontFamily: j.brandConfig?.fontFamily ?? "Montserrat",
          watermarkUrl: j.brandConfig?.watermarkUrl ?? null
        },

        durationSeconds: j.durationSeconds ?? 60,
        title: j.quizData?.title ?? j.topic ?? "",
        description: j.quizData?.description ?? "",
        hashtags: j.quizData?.hashtags ?? [],
        _generatedBy: j._generatedBy ?? "unknown"
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text().catch(() => "(unreadable)");
      return NextResponse.json({ error: `Engine returned ${res.status}: ${text}` }, { status: res.status });
    }

    return NextResponse.json({ triggered: true, jobId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Engine unreachable" }, { status: 502 });
  }
}