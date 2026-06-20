import { NextResponse } from "next/server";
import { enhanceAgent } from "../../../agents/enhance-agent";
import { LLMProvider } from "../../../ai/provider";
import { ScriptSchema } from "../../../lib/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const draft = String(body?.draft ?? "").trim();
    const provider = body?.provider as LLMProvider | undefined;

    if (!draft) return NextResponse.json({ error: "Missing draft" }, { status: 400 });

    const raw = await enhanceAgent({ draft, provider });

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "AI response malformed" },
        { status: 422 }
      );
    }

    const parsed = ScriptSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "AI response malformed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json({ enhanced: parsed.data });

  } catch (err: any) {
    // Covers JSON.parse failures and unexpected runtime errors.
    return NextResponse.json(
      { error: err?.message ?? "Failed to enhance draft" },
      { status: 500 }
    );
  }
}



