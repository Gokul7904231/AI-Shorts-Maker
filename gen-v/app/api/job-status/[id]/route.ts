import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase-admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const doc = await db.collection("videos").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = doc.data();
    if (!job) {
      return NextResponse.json({ error: "Job data is empty" }, { status: 404 });
    }

    return NextResponse.json({
      id: doc.id,
      videoId: doc.id,
      status: job.status,
      videoUrl: job.videoUrl,
      thumbnailUrl: job.thumbnailUrl,
      subtitlesUrl: job.subtitlesUrl,
      output:
        job.status === "completed"
          ? {
              renderProfile: job.renderProfile,
              fps: job.fps,
              resolution: job.resolution,
              videoUrl: job.videoUrl,
              thumbnailUrl: job.thumbnailUrl,
              subtitlesUrl: job.subtitlesUrl,
              timings: job.timings,
              cache: job.cache,
            }
          : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
