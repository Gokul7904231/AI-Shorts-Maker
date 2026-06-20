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
  difficulty: z.enum(["easy", "medium", "hard"]),
  question: z.string(),
  options: z.array(z.string()),
  answer: z.string(),
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
});

function validateQuizContent(quiz: { hook?: string; questions?: any[] }) {
  const errors: string[] = [];
  if (!quiz.hook) errors.push("Missing hook");
  if (!Array.isArray(quiz.questions) || quiz.questions.length !== 10) {
    errors.push(`Quiz must contain exactly 10 questions, got ${quiz.questions?.length ?? 0}`);
  } else {
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const q = quiz.questions[i];
      const num = i + 1;
      if (!q.question || typeof q.question !== "string" || q.question.trim().length === 0) {
        errors.push(`Question ${num} text is missing or invalid`);
        continue;
      }
      if (!Array.isArray(q.options) || q.options.length !== 3) {
        errors.push(`Question ${num} must have exactly 3 options`);
      } else {
        if (!q.answer || typeof q.answer !== "string") {
          errors.push(`Question ${num} is missing answer`);
        } else if (!q.options.includes(q.answer)) {
          errors.push(`Question ${num} answer "${q.answer}" must match one of the options`);
        }
      }
      const diff = String(q.difficulty ?? "").toLowerCase();
      if (i >= 0 && i <= 2 && diff !== "easy") {
        errors.push(`Question ${num} difficulty must be 'easy', got '${diff}'`);
      } else if (i >= 3 && i <= 5 && diff !== "medium") {
        errors.push(`Question ${num} difficulty must be 'medium', got '${diff}'`);
      } else if (i >= 6 && i <= 9 && diff !== "hard") {
        errors.push(`Question ${num} difficulty must be 'hard', got '${diff}'`);
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
        status: "queued",
        createdAt: new Date().toISOString(),
        renderDurationSeconds: 0,
        videoSizeMb: 0.0,
      };
    }

    // Initialize document in Firestore
    await saveJobManifest(jobId, finalPayload);

    // Call standalone python microservice
    const renderEngineUrl = process.env.NEXT_PUBLIC_RENDER_ENGINE_URL;
    if (!renderEngineUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_RENDER_ENGINE_URL is not set" },
        { status: 500 }
      );
    }

    try {
      const response = await fetch(`${renderEngineUrl}/render-video`, {
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
      });

      if (!response.ok) {
        await saveJobManifest(jobId, { status: "failed" });
        const resText = await response.text();
        return NextResponse.json(
          { error: `Microservice returned error: ${resText}` },
          { status: response.status }
        );
      }
    } catch (err: any) {
      await saveJobManifest(jobId, { status: "failed" });
      return NextResponse.json(
        { error: `Failed to trigger rendering microservice: ${err.message}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ jobId, status: "queued" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to generate video" },
      { status: 500 }
    );
  }
}
