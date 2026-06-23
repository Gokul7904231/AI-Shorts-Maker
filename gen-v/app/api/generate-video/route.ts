import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

import { saveJobManifest } from "../../../lib/jobs-history";
import { validateContent } from "../../../lib/content-pipeline";

const SceneInputSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  text: z.string().optional(),
  contactText: z.string().optional(),
  imagePrompt: z.string().optional(),
});

const QuizQuestionInputSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  question: z.string(),
  options: z.array(z.string()),
  answer: z.string().optional(),
  answerIndex: z.number().int().min(0).max(3).optional(),
});

const GenerateVideoRequestSchema = z.object({
  topic: z.string(),
  style: z.string().optional(),
  script: z.string().optional(),
  scenes: z.array(SceneInputSchema).optional(),
  contentType: z.string().optional(),
  hook: z.string().optional(),
  questions: z.array(QuizQuestionInputSchema).optional(),
  renderProfile: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  // YouTube Shorts target duration (clamped server-side to 30–60 s)
  durationSeconds: z.number().optional(),
});

function validateQuizContent(quiz: { hook?: string; questions?: any[] }) {
  const errors: string[] = [];
  if (!quiz.hook) errors.push("Missing hook");
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    errors.push(`Quiz must contain at least 1 question, got ${quiz.questions?.length ?? 0}`);
  } else {
    const seen = new Set<string>();
    const expectedLength = quiz.questions.length;
    for (let i = 0; i < expectedLength; i++) {
      const q = quiz.questions[i];
      const num = i + 1;
      if (!q.question || typeof q.question !== "string" || q.question.trim().length === 0) {
        errors.push(`Question ${num} text is missing or invalid`);
        continue;
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`Question ${num} must have at least 2 options`);
      } else {
        const hasAnswerIndex = typeof q.answerIndex === "number" && q.answerIndex >= 0 && q.answerIndex < q.options.length;
        const hasAnswer = typeof q.answer === "string" && q.answer.trim().length > 0;

        if (!hasAnswer && !hasAnswerIndex) {
          errors.push(`Question ${num} is missing a valid answer or answerIndex`);
        } else if (hasAnswer && !hasAnswerIndex && !q.options.includes(q.answer)) {
          // Only reject if answer string doesn't match any option AND no answerIndex fallback
          errors.push(`Question ${num} answer "${q.answer}" must match one of the options`);
        }
      }

      // Difficulty is optional for geo-quiz; only enforce for strict 10-question format
      if (expectedLength === 10) {
        const diff = String(q.difficulty ?? "").toLowerCase();
        if (i >= 0 && i <= 2 && diff !== "easy") {
          errors.push(`Question ${num} difficulty must be 'easy', got '${diff}'`);
        } else if (i >= 3 && i <= 5 && diff !== "medium") {
          errors.push(`Question ${num} difficulty must be 'medium', got '${diff}'`);
        } else if (i >= 6 && i <= 9 && diff !== "hard") {
          errors.push(`Question ${num} difficulty must be 'hard', got '${diff}'`);
        }
      }

      const qText = q.question.trim().toLowerCase();
      if (seen.has(qText)) {
        errors.push(`Duplicate question detected: "${q.question}"`);
      }
      seen.add(qText);
    }
  }
  return { approved: errors.length === 0, errors };
}

export async function POST(req: Request) {
  try {
    let userId = "anonymous";
    try {
      const authResult = await auth();
      if (authResult?.userId) {
        userId = authResult.userId;
      }
    } catch {
      // clerk SDK auth might fail or throw if Clerk keys are not configured yet, fallback to anonymous
    }

    const body = await req.json();
    const parsed = GenerateVideoRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const jobId = `job_${crypto.randomBytes(8).toString("hex")}`;
    let finalPayload: any = null;

    // Clamp duration to YouTube Shorts range (30–60 s)
    const rawDuration = parsed.data.durationSeconds ?? 45;
    const durationSeconds = Math.min(60, Math.max(30, Number.isFinite(rawDuration) ? rawDuration : 45));

    if (parsed.data.contentType === "QUIZ_SHORTS") {
      const validate = validateQuizContent({
        hook: parsed.data.hook,
        questions: parsed.data.questions,
      });
      if (!validate.approved) {
        return NextResponse.json(
          { error: "Content rejected", details: validate },
          { status: 422 }
        );
      }

      finalPayload = {
        userId,
        topic: parsed.data.topic,
        style: parsed.data.style ?? "",
        script: parsed.data.hook ?? "",
        scenes: [],
        contentType: "QUIZ_SHORTS",
        quizData: {
          hook: parsed.data.hook,
          questions: parsed.data.questions,
          title: parsed.data.title,
          description: parsed.data.description,
          hashtags: parsed.data.hashtags,
        },
        renderProfile: parsed.data.renderProfile || "FAST_QUIZ",
        durationSeconds,
        status: "queued",
        createdAt: new Date().toISOString(),
        renderDurationSeconds: 0,
        videoSizeMb: 0.0,
      };
    } else {
      const scenes = parsed.data.scenes ?? [];
      const hookFromScenes = (() => {
        const lines = String(parsed.data.script ?? "").split("\n").map((l) => l.trim());
        return lines.find((l) => l.length > 0) ?? "";
      })();

      const validate = await validateContent({
        topic: parsed.data.topic,
        script: parsed.data.script,
        hook: hookFromScenes,
        scenes: scenes.map((s: any) => ({ text: s.text ?? s.contactText ?? "", imagePrompt: s.imagePrompt ?? "" })),
        hashtags: [],
      }).catch((e) => ({
        approved: false,
        score: 0,
        errors: [e?.message ?? "Validation failed"],
        warnings: [],
      }));

      let finalScript = parsed.data.script ?? "";
      let finalScenes = scenes;

      if (!validate.approved) {
        const { autoRefinePipeline } = await import("../../../lib/auto-refine-pipeline");
        const refined = await autoRefinePipeline({
          topic: parsed.data.topic,
          style: parsed.data.style,
          hook: hookFromScenes,
          script: parsed.data.script,
          scenes: scenes.map((s: any) => ({
            id: s.id,
            text: s.text ?? s.contactText ?? "",
            imagePrompt: s.imagePrompt ?? "",
          })),
          provider: undefined,
        });

        if (!refined.approved) {
          return NextResponse.json(
            { error: "Content rejected after auto-refine", details: refined },
            { status: 422 }
          );
        }

        finalScript = refined.script;
        finalScenes = refined.scenes.map((s: any) => ({
          contactText: s.text,
          imagePrompt: s.imagePrompt,
        }));
      }

      finalPayload = {
        userId,
        topic: parsed.data.topic,
        style: parsed.data.style ?? "",
        script: finalScript,
        scenes: finalScenes,
        contentType: parsed.data.contentType || "MOTIVATIONAL",
        renderProfile: parsed.data.renderProfile || "STANDARD_SHORTS",
        durationSeconds,
        status: "queued",
        createdAt: new Date().toISOString(),
        renderDurationSeconds: 0,
        videoSizeMb: 0.0,
      };
    }

    // Initialize document in Firestore
    await saveJobManifest(jobId, finalPayload);

    // Fire-and-forget: trigger the rendering microservice without blocking job submission.
    // The job is already persisted in Firestore as "queued", so the render engine will
    // automatically pick it up on startup even if this fetch fails.
    const renderEngineUrl = process.env.NEXT_PUBLIC_RENDER_ENGINE_URL;
    if (renderEngineUrl) {
      // Use AbortController to prevent the fetch from hanging indefinitely.
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
          ...body,
          // Send normalized/refined content to the microservice
          script: finalPayload.script,
          scenes: finalPayload.scenes,
          quizData: finalPayload.quizData,
        }),
        signal: controller.signal,
      })
        .then(async (response) => {
          clearTimeout(timeoutId);
          if (!response.ok) {
            const resText = await response.text().catch(() => "(unreadable)");
            console.error(`[generate-video] Render engine returned ${response.status}: ${resText}`);
            // Don't mark as failed — engine may retry internally; leave status as "queued"
          }
        })
        .catch((err: any) => {
          clearTimeout(timeoutId);
          // Log but do NOT fail the request — job is in Firestore and engine will
          // pick it up automatically when it comes online (startup re-queue).
          console.warn(`[generate-video] Render engine unreachable (job ${jobId} stays queued): ${err?.message ?? err}`);
        });
    } else {
      console.warn("[generate-video] NEXT_PUBLIC_RENDER_ENGINE_URL is not set — job queued in Firestore only.");
    }

    return NextResponse.json({ jobId, videoId: jobId, status: "queued" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to generate video" },
      { status: 500 }
    );
  }
}
