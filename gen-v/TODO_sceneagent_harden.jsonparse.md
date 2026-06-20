# TODO - Harden scene-agent JSON parsing

## Information gathered
- `gen-v/agents/scene-agent.ts` contains `regenerateSceneAgent()` with:
  - system prompt: "Output ONLY valid JSON."
  - JSON parsing: `raw.match(/\{[\s\S]*\}/)` then `JSON.parse(jsonText)`
  - No logging of raw model output
  - Schema check is manual and swallows the exact parse failure context.
- `gen-v/app/api/regenerate-scene/route.ts` returns 500 with only `err.message`, so without logging we lose visibility.

## Plan
1. Update `gen-v/agents/scene-agent.ts`
   - Strengthen `system` prompt with strict output rules: JSON only, no markdown/code fences, no text before/after.
   - Add `console.log` for raw Gemini output before parsing.
   - Add safer JSON extraction fallback:
     - attempt direct `JSON.parse(raw)` first
     - then extract first JSON object via regex `raw.match(/\{[\s\S]*\}/)`
     - if still fails, throw error including a short snippet of raw.
2. (Optional if time) Loosen type expectations
   - Ensure `id` accepts number|string from JSON, then normalize to string for return type.
3. Run TypeScript check / lint if available.

## Followup steps
- Deploy/retry the failing endpoint once changes are in.
- If parsing still fails, capture logged `rawResponse` from server logs and further tune extraction.

