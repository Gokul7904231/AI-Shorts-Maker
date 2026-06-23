import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase-admin";
import { saveJobManifest } from "../../../../lib/jobs-history";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const quizId = String(body?.quizId ?? "").trim();
    const theme = String(body?.theme ?? "").trim();
    const questions = body?.questions;

    if (!quizId) {
      return NextResponse.json({ error: "Missing quizId" }, { status: 400 });
    }
    if (!theme || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Missing theme or questions data" }, { status: 400 });
    }

    // 1) Update quizzes draft collection
    const quizRef = db.collection("quizzes").doc(quizId);
    const quizDoc = await quizRef.get();
    if (!quizDoc.exists) {
      return NextResponse.json({ error: "Quiz draft not found" }, { status: 404 });
    }
    const quizDb = quizDoc.data();

    const hook = String(body?.hook ?? quizDb?.hook ?? `Let's test your knowledge in ${theme}!`).trim();
    const gradingScale = String(body?.gradingScale ?? quizDb?.gradingScale ?? "0/3: Tourist. 3/3: True Citizen.").trim();
    const voiceCode = String(body?.voiceCode ?? quizDb?.voiceCode ?? "en-US-ChristopherNeural").trim();
    const flagUrl = String(body?.flagUrl ?? quizDb?.flagUrl ?? "").trim();
    const country = String(body?.country ?? quizDb?.country ?? theme).trim();
    const difficulty = String(body?.difficulty ?? quizDb?.difficulty ?? "Medium").trim();
    const versionNum = Math.max(1, Number(body?.version ?? quizDb?.version ?? 1));
    const batch = String(body?.batch ?? quizDb?.batch ?? "1").trim();

    await quizRef.update({
      theme,
      questions,
      hook,
      gradingScale,
      voiceCode,
      flagUrl,
      difficulty,
      version: versionNum,
      batch,
      status: "queued",
      compiledAt: new Date().toISOString(),
    });

    // 2) Set up job manifest in videos collection for tracking & rendering
    const jobId = quizId;
    const finalPayload = {
      jobId,
      userId: "anonymous",
      topic: theme,
      style: "Trivia",
      script: hook,
      scenes: [],
      contentType: "QUIZ_SHORTS" as const,
      difficulty,
      version: versionNum,
      batch,
      quizData: {
        hook,
        questions,
        title: theme,
        description: `Trivia quiz about ${theme}`,
        hashtags: ["quiz", "trivia", "shorts"],
        flagUrl,
        voiceCode,
        gradingScale,
        country,
      },
      renderProfile: "FAST_QUIZ",
      status: "queued" as const,
      createdAt: new Date().toISOString(),
      renderDurationSeconds: 0,
      videoSizeMb: 0.0,
    };

    await saveJobManifest(jobId, finalPayload);

    // 3) Fire-and-forget: trigger the rendering microservice without blocking.
    // The job is already persisted in Firestore as "queued"; the engine re-queues on startup.
    const renderEngineUrl = process.env.NEXT_PUBLIC_RENDER_ENGINE_URL;
    if (renderEngineUrl) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10 s timeout

      fetch(`${renderEngineUrl}/render-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_SECRET_KEY}`,
        },
        body: JSON.stringify({
          jobId,
          topic: finalPayload.topic,
          style: finalPayload.style,
          script: finalPayload.script,
          contentType: "QUIZ_SHORTS",
          hook: finalPayload.script,
          questions: questions,
          quizData: finalPayload.quizData,
          renderProfile: finalPayload.renderProfile,
          difficulty: finalPayload.difficulty,
          version: finalPayload.version,
          batch: finalPayload.batch,
          country: country,
        }),
        signal: controller.signal,
      })
        .then(async (response) => {
          clearTimeout(timeoutId);
          if (!response.ok) {
            const resText = await response.text().catch(() => "(unreadable)");
            console.error(`[quiz/compile] Render engine returned ${response.status}: ${resText}`);
          }
        })
        .catch((err: any) => {
          clearTimeout(timeoutId);
          console.warn(`[quiz/compile] Render engine unreachable (job ${jobId} stays queued): ${err?.message ?? err}`);
        });
    } else {
      console.warn("[quiz/compile] NEXT_PUBLIC_RENDER_ENGINE_URL is not set — job queued in Firestore only.");
    }

    return NextResponse.json({ quizId, jobId, status: "queued" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
