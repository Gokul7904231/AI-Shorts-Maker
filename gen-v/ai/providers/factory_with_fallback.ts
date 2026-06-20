import { LLMProviderAdapter, LLMProvider } from "../provider";
import { createGeminiProvider } from "./gemini";
import { createGroqProvider } from "./groq";
import { createOpenRouterProvider } from "./openrouter";

export function providerFactoryWithOpenRouterFallback(
  provider: LLMProvider,
  ctx: { apiKey?: string }
): LLMProviderAdapter {
  // Simple: try requested provider; if it fails, try OpenRouter.
  // This keeps OpenRouter as a consistent last-resort for agent reliability.
  const primary = (() => {
    switch (provider) {
      case "gemini":
        return createGeminiProvider(ctx);
      case "groq":
        return createGroqProvider(ctx);
      case "openrouter":
        return createOpenRouterProvider(ctx);
      case "huggingface":
      default:
        return createOpenRouterProvider(ctx);

    }
  })();

  const fallback = createOpenRouterProvider(ctx);

  return {
    async generateText(params) {
      try {
        return await primary.generateText(params);
      } catch (err) {
        return await fallback.generateText(params);
      }
    },
  };
}

