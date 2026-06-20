import { NextResponse } from "next/server";
import { readJobManifest } from "../../../../lib/jobs-history";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const manifest = await readJobManifest(jobId);
  if (!manifest) {
    return NextResponse.json({ error: "Job history not found" }, { status: 404 });
  }

  return NextResponse.json(manifest, { status: 200 });
}

