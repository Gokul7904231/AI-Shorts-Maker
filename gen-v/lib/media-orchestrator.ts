import { VideoJob } from "./job-store";
import { runLocalGeneration } from "./python-runner";
import { VideoGenerationResultSchema, type VideoGenerationResult } from "./video-schema";


type MediaOrchestratorResult = Omit<VideoGenerationResult, "status"> & {
  status: "completed" | "failed";
};



function normalizeScenes(scenes: any): any[] {
  if (!scenes) return [];
  if (Array.isArray(scenes)) return scenes;
  return [];
}

async function writeJobPayload(payload: {
  topic: string;
  script: string;
  style: string;
  scenes: any[];
  jobId: string;
}): Promise<string> {
  // Node-only file write. Next.js route/server components can import fs.
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");

  // Always write to repo-local gen-v/generated, regardless of current working directory.
  const outDir = path.join(__dirname, "..", "generated", "jobs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `${payload.jobId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf-8");
  return outPath;
}

function getPythonResultPath(jobId: string): string {
  const path = require("path") as typeof import("path");
  // local-ai/output/{jobId}/result.json relative to gen-v root
  const repoRoot = path.join(__dirname, "..", "..");
  return path.join(repoRoot, "local-ai", "output", jobId, "result.json");
}

export async function startVideoGeneration(job: VideoJob): Promise<MediaOrchestratorResult> {
  const fs = require("fs") as typeof import("fs");


  // 1) normalize scenes
  const scenes = normalizeScenes(job.scenes);

  // 2) prepare generation payload
  const payload = {
    topic: job.topic,
    script: job.script,
    style: job.style,
    scenes,
    jobId: job.id,
    contentType: (job as any).contentType,
    quizData: (job as any).quizData,
    renderProfile: (job as any).renderProfile || job.renderProfile,
  };

  // 3) write payload JSON for future python reader
  const jobFilePath = await writeJobPayload(payload);

  // 4) run local python (wait for completion)
  await runLocalGeneration(jobFilePath);

  // 5) read and validate result.json
  const resultPath = getPythonResultPath(job.id);
  if (!fs.existsSync(resultPath)) {
    throw new Error(`Missing python result.json at: ${resultPath}`);
  }

  const raw = fs.readFileSync(resultPath, "utf-8");
  const parsed = VideoGenerationResultSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    throw new Error(`Invalid result.json schema. ${parsed.error.message}`);
  }

const result = parsed.data as any;

  const normalizedStatus: "completed" | "failed" =
    result.status === "completed" ? "completed" : "failed";

  return {
    ...result,
    jobId: result.jobId,
    status: normalizedStatus,
    sceneFiles: result.sceneFiles ?? [],
    // If python scaffold only outputs scene mp4s, we still provide card-level URLs.
    // Frontend will prefer output.videoUrl/thumbnailUrl from job-status.
    finalVideo: result.finalVideo ?? "final.mp4",
    thumbnail: result.thumbnail ?? "thumbnail.png",
  };
}







