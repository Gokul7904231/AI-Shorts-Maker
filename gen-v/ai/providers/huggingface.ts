import { LLMProviderAdapter } from "../provider";

// Note: This repo currently focuses on Gemini + Groq + OpenRouter.
// This adapter is left as a simple pass-through stub for now.
// It exists only so providerFactory can compile when "huggingface" is selected.

export function createHuggingFaceProvider(_ctx: { apiKey?: string }): LLMProviderAdapter {
  return {
    async generateText(params) {
      return `HuggingFace stub response. Prompt: ${params.prompt.slice(0, 200)}`;
    },
  };
}

