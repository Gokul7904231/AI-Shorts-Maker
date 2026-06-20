import { providerFactory } from "../ai/factory";
import { LLMProvider } from "../ai/provider";
import { createSceneId } from "../lib/scene-utils";
import { HIGH_RETENTION_RULES } from "../prompts/retention-rules";
import { RETENTION_SCENE_RULES } from "../prompts/retention-scene-rules";

export type ScriptAgentInput = {
  topic: string;
  durationSeconds: number;
  style?: string;
  trend?: string;
  provider?: LLMProvider;
  contentType?: string;
};

function clampScenes(durationSeconds: number) {
  // Short videos need fewer beats.
  const base = Math.round(durationSeconds / 6); // ~6s per scene
  return Math.max(3, Math.min(10, base));
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try to extract first JSON block.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

export async function scriptAgent(
  input: ScriptAgentInput
): Promise<any> {
  const provider =
    input.provider ??
    (process.env.DEFAULT_LLM_PROVIDER as LLMProvider | undefined) ??
    "gemini";
  const llm = providerFactory(provider, { apiKey: undefined });

  if (input.contentType === "QUIZ_SHORTS") {
    const system =
      "You are a quiz generation script engine. Output MUST be valid JSON only. No markdown. No code blocks.";

    const prompt = `
Generate a 10-question quiz script optimized for YouTube Shorts / TikTok.
Topic: ${input.topic}
Style: ${input.style ?? "(not specified)"}

The hook must create strong curiosity and encourage completion. Use or adapt one of these high-performing hook templates:
- "Only 1% get Question 10 right."
- "Most people fail Question 8." (or adapt based on topic, e.g., "Most Indians fail...", "Most history buffs fail...")
- "Let's see if you're smarter than the average person."
- "Can you beat 7/10?"

Difficulty progression:
- Q1-Q3 MUST be easy.
- Q4-Q6 MUST be medium.
- Q7-Q10 MUST be hard.

Every question MUST contain exactly:
- "difficulty": "easy" or "medium" or "hard"
- "question": "Question text"
- "options": ["Option A text", "Option B text", "Option C text"]
- "answer": "The correct option text exactly (must match one of the options)"
- "explanation": "A short 1-sentence educational explanation or fun fact about the correct answer (max 15 words)"

Also generate automated social media metadata:
- "title": A high-converting curiosity title that MUST satisfy one of these exact hook templates:
  1. "Most people fail Question X" (or adapt based on topic/demographics, e.g., "Most Indians fail Question 8")
  2. "Only 1% get Question X right"
  3. "Can you score 10/10?"
  4. "Can you beat 7/10?"
  5. "Let's test your knowledge"
  NEVER use generic titles like "General Knowledge Quiz", "Science Quiz", "History Quiz", or any title ending in "Quiz".
- "description": A short, search-optimized description summarizing the quiz.
- "hashtags": An array of 3-5 relevant hashtags (e.g. ["shorts", "quiz", "trivia", "science"]).

Return JSON ONLY in this exact format:
{
  "contentType": "QUIZ_SHORTS",
  "hook": "...",
  "questions": [
    {
      "difficulty": "easy",
      "question": "...",
      "options": ["A", "B", "C"],
      "answer": "...",
      "explanation": "..."
    }
  ],
  "title": "...",
  "description": "...",
  "hashtags": ["...", "..."],
  "renderProfile": "FAST_QUIZ",
  "estimatedDuration": 45
}
`;

    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        const raw = await llm.generateText({
          prompt,
          system,
          temperature: 0.7,
          maxTokens: 1500,
        });

        const parsed = safeJsonParse<any>(raw);
        if (!parsed) continue;

        const questions = parsed.questions;
        if (!parsed.hook || !Array.isArray(questions) || questions.length !== 10) continue;
        if (!parsed.title || !parsed.description || !Array.isArray(parsed.hashtags)) continue;

        // Title validation for CTR hook rules
        const titleLower = String(parsed.title).toLowerCase();
        const hasHookPattern = 
          titleLower.includes("fail question") || 
          titleLower.includes("get question") || 
          titleLower.includes("score 10/10") || 
          titleLower.includes("beat 7/10") || 
          titleLower.includes("test your knowledge");
        
        const isGenericQuiz = 
          titleLower.endsWith("quiz") || 
          titleLower === "general knowledge quiz" || 
          titleLower === "science quiz" || 
          titleLower === "history quiz";

        if (!hasHookPattern || isGenericQuiz) {
          console.warn(`[ScriptAgent] Generated title "${parsed.title}" failed CTR validation. Retrying...`);
          continue;
        }

        let valid = true;
        const seen = new Set<string>();
        for (let i = 0; i < 10; i++) {
          const q = questions[i];
          if (!q || !q.question || !Array.isArray(q.options) || q.options.length !== 3 || !q.answer || !q.difficulty || !q.explanation) {
            valid = false;
            break;
          }
          if (!q.options.includes(q.answer)) {
            valid = false;
            break;
          }
          const difficulty = String(q.difficulty).toLowerCase();
          if (i >= 0 && i <= 2 && difficulty !== "easy") valid = false;
          if (i >= 3 && i <= 5 && difficulty !== "medium") valid = false;
          if (i >= 6 && i <= 9 && difficulty !== "hard") valid = false;
          
          const qText = q.question.trim().toLowerCase();
          if (seen.has(qText)) valid = false;
          seen.add(qText);
        }

        if (valid) {
          return parsed;
        }
      } catch (err) {
        // ignore and retry
      }
    }
    throw new Error("ScriptAgent failed to generate a valid 10-question quiz script after 3 attempts.");
  }

  const scenesCount = clampScenes(input.durationSeconds);

  const system =
    "You are a retention-first YouTube Shorts script engine. Output MUST be valid JSON only. No markdown.";

  const prompt = `
${HIGH_RETENTION_RULES}

${RETENTION_SCENE_RULES}

Generate a ${scenesCount}-scene Shorts script.

Topic:
${input.topic}

Style:
${input.style ?? "(not specified)"}

Trend reference:
${input.trend ?? "(not specified)"}

Rules (must follow):
- Return JSON only in this exact shape:
  {"scenes":[{"contactText":"...","imagePrompt":"..."}]}
- scenes count MUST be exactly ${scenesCount}.
- contactText is spoken narration. Each scene: 1 punchy beat, max ~12-16 words.
- First scene (first 1-3 seconds) MUST include at least one: insecurity trigger, you-are-doing-this-wrong, hidden mistake, transformation reveal, or controversial insight.
- Avoid generic motivation.
- Each imagePrompt must be cinematic + scroll-stopping and include at least one camera movement phrase.
- Avoid static shots and vague prompts.
- Avoid repeated phrasing across scenes.

Return JSON only.
`;

  const raw = await llm.generateText({
    prompt,
    system,
    temperature: 0.7,
    maxTokens: 950,
  });

  const parsed = safeJsonParse<{
    scenes: Array<{ contactText: string; imagePrompt: string }>;
  }>(raw);

  if (!parsed?.scenes || !Array.isArray(parsed.scenes)) {
    throw new Error("ScriptAgent failed to parse model output as JSON.");
  }

  const scenes = parsed.scenes
    .slice(0, scenesCount)
    .map((s) => ({
      id: createSceneId(),
      contactText: s.contactText,
      imagePrompt: s.imagePrompt,
    }));

  while (scenes.length < scenesCount) {
    scenes.push({
      id: createSceneId(),
      contactText: "(scene stub)",
      imagePrompt: "(image prompt stub)",
    });
  }

  return { scenes };
}

