import { LLMProvider, LLMProviderAdapter } from "./provider";
import { providerFactoryWithOpenRouterFallback } from "./providers/factory_with_fallback";
import { createHuggingFaceProvider } from "./providers/huggingface";




export function providerFactory(provider: LLMProvider, ctx: { apiKey?: string }): LLMProviderAdapter {
  // OpenRouter is used as a last-resort fallback to keep generation resilient.
  // If the primary provider succeeds, its output is returned.
  if (provider === "huggingface") {
    return createHuggingFaceProvider(ctx);
  }

  return providerFactoryWithOpenRouterFallback(provider, ctx);
}


