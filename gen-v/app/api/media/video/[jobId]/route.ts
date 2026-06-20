import { NextResponse } from "next/server";
import path from "path";

import fs from "fs";

function getVideoPath(jobId: string) {
  const root = process.cwd();
  
  // Use Turbopack ignore comments to prevent bundling these dynamic paths
  const baseDir1 = path.join(/*turbopackIgnore: true*/ root, "generated", "local-ai", "output", jobId);
  const baseDir2 = path.join(/*turbopackIgnore: true*/ root, "local-ai", "output", jobId);

  const checkDirs = [baseDir1, baseDir2];

  for (const baseDir of checkDirs) {
    const finalMp4 = path.join(/*turbopackIgnore: true*/ baseDir, "final.mp4");
    if (fs.existsSync(finalMp4)) return finalMp4;

    // Fallback (older scaffold may not have generated final.mp4)
    const possible = ["final/final.mp4", "outputs/final/final.mp4", "output/final.mp4"];
    for (const rel of possible) {
      const p = path.join(/*turbopackIgnore: true*/ baseDir, rel);
      if (fs.existsSync(p)) return p;
    }
  }

  // default fallback path
  return path.join(/*turbopackIgnore: true*/ baseDir1, "final.mp4");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const videoPath = getVideoPath(jobId);
  if (!fs.existsSync(videoPath)) {
    return NextResponse.json(
      { error: "Video not found", jobId },
      { status: 404 }
    );
  }

  const stat = fs.statSync(videoPath);

  const contentType = "video/mp4";

  // Simple streaming first (range requests later).
  const fileStream = fs.createReadStream(videoPath);

  const res = new NextResponse(fileStream as any, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });

  return res;
}

