import { NextResponse } from "next/server";
import { z } from "zod";

import { validateContent } from "../../../lib/content-pipeline";

const ContentHealthInputSchema = z.object({
  topic: z.string(),
  script: z.string(),
  scenes: z.array(
    z.object({
      text: z.string(),
      imagePrompt: z.string(),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ContentHealthInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await validateContent({
      topic: parsed.data.topic,
      script: parsed.data.script,
      scenes: parsed.data.scenes,
      hook: (parsed.data.script.split("\n").find((l) => l.trim().length > 0) ?? "").trim(),
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to validate content" },
      { status: 500 }
    );
  }
}

