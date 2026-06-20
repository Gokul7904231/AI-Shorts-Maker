import { NextResponse } from "next/server";
import { LLMProvider } from "../../../ai/provider";
import { regenerateSceneAgent } from "../../../agents/scene-agent";

export async function POST(req: Request) {

  try {
    const body = await req.json();


    const topic = String(body?.topic ?? "").trim();
    const style = typeof body?.style === "string" ? body.style : undefined;
    const provider = body?.provider as LLMProvider | undefined;

    const sceneId = String(body?.sceneId ?? "").trim();
    const currentScene = String(body?.currentScene ?? "").trim();

    const previousScene = typeof body?.previousScene === "string" ? body.previousScene : "";
    const nextScene = typeof body?.nextScene === "string" ? body.nextScene : "";


    const currentImagePrompt = String(body?.currentImagePrompt ?? "").trim();
    const previousImagePrompt =
      typeof body?.previousImagePrompt === "string" ? body.previousImagePrompt : "";
    const nextImagePrompt = typeof body?.nextImagePrompt === "string" ? body.nextImagePrompt : "";

    if (!topic) return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    if (!sceneId) return NextResponse.json({ error: "Missing/invalid sceneId" }, { status: 400 });

    if (!currentScene) return NextResponse.json({ error: "Missing currentScene" }, { status: 400 });
    if (!currentImagePrompt) return NextResponse.json({ error: "Missing currentImagePrompt" }, { status: 400 });

    const result = await regenerateSceneAgent({
      sceneId,
      topic,
      style,
      currentScene,
      previousScene,
      nextScene,
      currentImagePrompt,
      previousImagePrompt,
      nextImagePrompt,
      provider,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to regenerate scene" },
      { status: 500 }
    );
  }
}

