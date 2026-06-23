import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase-admin";

export const runtime = "nodejs";

const BLUEPRINT_ID = "geo_quiz";

/**
 * GET /api/admin/blueprint
 * Fetches the prompt_blueprints/geo_quiz document from Firestore.
 */
export async function GET() {
  try {
    const doc = await db.collection("prompt_blueprints").doc(BLUEPRINT_ID).get();
    if (!doc.exists) {
      // Return default blueprint so the UI has something to edit
      return NextResponse.json({
        id: BLUEPRINT_ID,
        systemPrompt:
          "You are a viral YouTube Shorts script and quiz generator.\n" +
          "You MUST output a single, flat JSON object containing:\n" +
          "- hook (string): a challenging or provocative opening hook line.\n" +
          "- questions (array of objects): each with question, options (4 strings), answerIndex (0-3).\n" +
          "- visual_prompt (string): a descriptive prompt for background visual generation.\n" +
          "No markdown, no conversational text. Output valid JSON only.",
        userPromptTemplate:
          "Generate a localized trivia quiz targeted at citizens of {countryName} ({countryCode}) " +
          "with tone level \"{tone}\".\n" +
          "Return exactly {numQuestions} trivia questions in the specified JSON format.",
        updatedAt: null,
      });
    }
    return NextResponse.json({ id: BLUEPRINT_ID, ...doc.data() });
  } catch (err: any) {
    console.error("[Blueprint GET]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/blueprint
 * Saves/updates the prompt_blueprints/geo_quiz document in Firestore.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { systemPrompt, userPromptTemplate } = body;

    if (!systemPrompt && !userPromptTemplate) {
      return NextResponse.json({ error: "At least one of systemPrompt or userPromptTemplate is required" }, { status: 400 });
    }

    const payload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (systemPrompt !== undefined) payload.systemPrompt = systemPrompt;
    if (userPromptTemplate !== undefined) payload.userPromptTemplate = userPromptTemplate;

    await db.collection("prompt_blueprints").doc(BLUEPRINT_ID).set(payload, { merge: true });
    return NextResponse.json({ status: "saved", id: BLUEPRINT_ID });
  } catch (err: any) {
    console.error("[Blueprint POST]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
