export function createSceneId(): string {
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();

  // Node fallback (non-crypto environments).
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require("crypto") as typeof import("crypto");
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // ignore
  }

  return String(Date.now());
}

export type MinimalScene = {
  id?: string;
  text: string;
  imagePrompt: string;
};

export function normalizeScenes<T extends MinimalScene>(
  scenes: T[] | null | undefined
): Array<{ id: string; text: string; imagePrompt: string }> {
  if (!Array.isArray(scenes)) return [];

  return scenes.map((scene) => ({
    id: scene?.id ?? createSceneId(),
    text: scene?.text ?? "",
    imagePrompt: scene?.imagePrompt ?? "",
  }));
}

