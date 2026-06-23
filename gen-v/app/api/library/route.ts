import { NextResponse } from "next/server";
import cloudinary from "cloudinary";

// Initialize Cloudinary server-side
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get("prefix") ?? "geo_quiz_factory";
    const maxResults = Math.min(parseInt(searchParams.get("max") ?? "20"), 50);

    const result = await cloudinary.v2.api.resources({
      type: "upload",
      resource_type: "video",
      prefix,
      max_results: maxResults,
      direction: "desc",
    });

    const videos = (result.resources ?? []).map((r: any) => ({
      publicId: r.public_id,
      url: r.secure_url,
      format: r.format,
      bytes: r.bytes,
      sizeMb: +(r.bytes / 1024 / 1024).toFixed(2),
      duration: r.duration ?? null,
      width: r.width,
      height: r.height,
      createdAt: r.created_at,
      folder: r.folder ?? prefix,
      displayName: r.public_id.split("/").pop()?.replace(/_/g, " ") ?? r.public_id,
    }));

    return NextResponse.json({
      total: videos.length,
      prefix,
      videos,
    });
  } catch (err: any) {
    console.error("[Library API]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
