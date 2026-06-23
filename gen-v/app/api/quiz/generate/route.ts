import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase-admin";
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const countryCode = String(body?.countryCode ?? "US").trim();
    const tone = String(body?.tone ?? "challenging").trim();
    const numQuestions = 8;
    const negativeConstraints = Array.isArray(body?.negativeConstraints) ? body.negativeConstraints : [];
    
    const system = `You are a viral YouTube Shorts script generator. You must generate exactly ${numQuestions} rapid-fire trivia questions for a 60-second high-retention video. Do not deviate from the ${numQuestions}-question limit. The output MUST be a single JSON object. No markdown. No code blocks.`;

    let constraintText = "";
    if (negativeConstraints.length > 0) {
      // Only pass the last 24 past questions (last 3 cycles) to prevent token bloat
      const recentConstraints = negativeConstraints.slice(0, 24);
      constraintText = `\nCRITICAL NEGATIVE CONSTRAINT - DO NOT repeat or reuse any of the following questions:\n${recentConstraints.map(q => `- ${q}`).join("\n")}\n`;
    }

    const prompt = `
Generate a localized trivia quiz targeted at citizens of ${countryCode} with tone level "${tone}".
Return exactly ${numQuestions} trivia questions.${constraintText}
The output must match this exact JSON format:
{
  "theme": "...",
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "answer": "...",
      "duration": 5
    }
  ]
}
`;

    let rawJsonStr = null;
    let generatedBy = "";

    // 1. ATTEMPT 1: Claude 3.5 Sonnet (OpenRouter)
    try {
      console.log("[LLM] Attempt 1: Claude 3.5 Sonnet via OpenRouter...");
      const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-sonnet",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt }
          ]
        })
      });
      if (!openRouterRes.ok) throw new Error(`OpenRouter HTTP ${openRouterRes.status}`);
      const orData = await openRouterRes.json();
      rawJsonStr = orData.choices[0].message.content;
      generatedBy = "claude-3.5-sonnet";
    } catch (e1) {
      console.warn("[LLM] Claude 3.5 Sonnet failed:", e1);
      
      // 2. ATTEMPT 2: Gemini 1.5 Flash
      try {
        console.log("[LLM] Attempt 2: Gemini 1.5 Flash...");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: `${system}\n\n${prompt}`,
          config: {
            responseMimeType: "application/json",
          }
        });
        rawJsonStr = response.text;
        generatedBy = "gemini-1.5-flash";
      } catch (e2) {
        console.warn("[LLM] Gemini 1.5 Flash failed:", e2);
        
        // 3. ATTEMPT 3: Groq LLaMA 3.1
        console.log("[LLM] Attempt 3: Groq LLaMA 3.1 8B Instant...");
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: system },
                { role: "user", content: prompt }
            ],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" },
        });
        rawJsonStr = chatCompletion.choices[0].message.content;
        generatedBy = "llama-3.1-8b-instant";
      }
    }

    if (!rawJsonStr) {
        throw new Error("All LLM generation attempts failed.");
    }

    // Try parsing
    let data: any = null;
    try {
      data = JSON.parse(rawJsonStr);
    } catch {
      const match = rawJsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        data = JSON.parse(match[0]);
      }
    }

    if (!data || !data.theme || !Array.isArray(data.questions)) {
      throw new Error(`Failed to generate a valid quiz payload. Output: ${rawJsonStr}`);
    }

    const docRef = db.collection("quizzes").doc();
    const quizId = docRef.id;
    const quizDoc = {
      quizId,
      status: "draft",
      theme: data.theme,
      questions: data.questions,
      country: countryCode,
      createdAt: new Date().toISOString(),
      _generated_by: generatedBy
    };
    
    await docRef.set(quizDoc);
    return NextResponse.json(quizDoc);
  } catch (err: any) {
    console.error("[Quiz Generate] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
