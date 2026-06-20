import { LLMProviderAdapter } from "../provider";

const DEFAULT_MODEL = "gemini-1.5-flash";

export function createGeminiProvider(ctx: { apiKey?: string }): LLMProviderAdapter {
  return {
    async generateText(params) {
      const apiKey = ctx.apiKey ?? process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

      const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const body = {
        systemInstruction: params.system ? { role: "user", parts: [{ text: params.system }] } : undefined,
        contents: [
          {
            role: "user",
            parts: [{ text: params.prompt }],
          },
        ],
        generationConfig: {
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: params.maxTokens ?? 512,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const json: any = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          json?.error?.message ??
          json?.error?.status ??
          `Gemini request failed with status ${res.status}`;
        throw new Error(msg);
      }

      const text: string | undefined =
        json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ??
        json?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("Gemini returned empty content");
      return text;
    },
  };
}


