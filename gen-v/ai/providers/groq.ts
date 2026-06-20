import { LLMProviderAdapter } from "../provider";

const DEFAULT_MODEL = "llama3-70b-8192";

export function createGroqProvider(ctx: { apiKey?: string }): LLMProviderAdapter {
  return {
    async generateText(params) {
      const apiKey = ctx.apiKey ?? process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("Missing GROQ_API_KEY");

      const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;

      const url = "https://api.groq.com/openai/v1/chat/completions";

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 512,
          messages: [
            ...(params.system ? [{ role: "system", content: params.system }] : []),
            { role: "user", content: params.prompt },
          ],
        }),
      });

      const json: any = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message ?? `Groq request failed with status ${res.status}`;
        throw new Error(msg);
      }

      const text: string | undefined = json?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Groq returned empty content");
      return text;
    },
  };
}

