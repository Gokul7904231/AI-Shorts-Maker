export type LLMProvider = "gemini" | "groq" | "openrouter" | "huggingface";

export type ProviderContext = {
  // Keep generic; concrete provider impls can interpret.
  apiKey?: string;
};

export interface LLMProviderAdapter {
  generateText(params: {
    prompt: string;
    system?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string>;
}

