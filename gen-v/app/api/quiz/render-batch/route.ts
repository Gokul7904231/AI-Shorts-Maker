import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase-admin";

export const runtime = "nodejs";

/**
 * POST /api/quiz/render-batch
 * Accepts a quizId, fetches its hooks array from Firestore,
 * and submits one render job per hook to the VPS render engine.
 */
export async function POST(req: Request) {
  try {
    const { quizId, renderProfile = "STANDARD_SHORTS" } = await req.json();
    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }

    // Fetch quiz from Firestore
    const quizDoc = await db.collection("quizzes").doc(quizId).get();
    if (!quizDoc.exists) {
      return NextResponse.json({ error: `Quiz ${quizId} not found` }, { status: 404 });
    }

    const quiz = quizDoc.data() as any;
    const hooks: string[] = quiz.hooks ?? [quiz.hook ?? "Can you pass this test?"];
    const questions = quiz.questions ?? [];

    if (!hooks.length) {
      return NextResponse.json({ error: "No hooks found in quiz document" }, { status: 400 });
    }

    const workerUrl = process.env.RENDER_ENGINE_URL ?? "http://127.0.0.1:8000";
    const workerSecret = process.env.INTERNAL_API_SECRET_KEY ?? "";

    const jobResults: Array<{ hookIndex: number; hook: string; jobId: string; status: string }> = [];

    for (let i = 0; i < hooks.length; i++) {
      const hook = hooks[i];
      const jobPayload = {
        jobId: `${quizId}_hook${i + 1}`,
        topic: quiz.country ?? "World Quiz",
        hook,
        contentType: "GEO_QUIZ",
        questions,
        quizData: {
          ...quiz,
          hook,
        },
        renderProfile,
        country: quiz.country,
        version: quiz.version ?? 1,
        batch: quizId,
      };

      try {
        const res = await fetch(`${workerUrl}/render-video`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${workerSecret}`,
          },
          body: JSON.stringify(jobPayload),
        });
        const data = await res.json();
        jobResults.push({
          hookIndex: i + 1,
          hook,
          jobId: data.videoId ?? jobPayload.jobId,
          status: res.ok ? "queued" : "error",
        });
      } catch (renderErr: any) {
        jobResults.push({
          hookIndex: i + 1,
          hook,
          jobId: jobPayload.jobId,
          status: "submit_failed",
        });
      }
    }

    // Update Firestore quiz doc with batch job IDs
    await db.collection("quizzes").doc(quizId).set(
      {
        batchJobs: jobResults,
        batchSubmittedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({
      quizId,
      hooksCount: hooks.length,
      jobs: jobResults,
    });
  } catch (err: any) {
    console.error("[Render Batch]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
