import { LLMProviderAdapter } from "../provider";

const DEFAULT_MODEL = "openai/gpt-4o-mini";

export function createOpenRouterProvider(ctx: { apiKey?: string }): LLMProviderAdapter {
  return {
    async generateText(params) {
      const apiKey = ctx.apiKey ?? process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

      const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

      const url = "https://openrouter.ai/api/v1/chat/completions";

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
        const msg = json?.error?.message ?? `OpenRouter request failed with status ${res.status}`;
        throw new Error(msg);
      }

      const text: string | undefined = json?.choices?.[0]?.message?.content;
      if (!text) throw new Error("OpenRouter returned empty content");
      return text;
    },
  };
}

