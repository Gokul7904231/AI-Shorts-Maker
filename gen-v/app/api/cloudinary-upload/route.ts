import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * POST /api/cloudinary-upload
 * Body: { jobId: string }
 *
 * Uploads the rendered video (and thumbnail) for the given jobId to Cloudinary.
 * Works for both local static URLs (/static/<jobId>/final.mp4) and
 * already-uploaded Cloudinary URLs (returns them as-is after re-uploading fresh).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const jobId = String(body?.jobId ?? "").trim();

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const renderEngineUrl = process.env.NEXT_PUBLIC_RENDER_ENGINE_URL;
    if (!renderEngineUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_RENDER_ENGINE_URL is not configured" },
        { status: 500 }
      );
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { error: "Cloudinary credentials are not configured" },
        { status: 500 }
      );
    }

    // 1. Resolve the source video URL from the render engine job-status endpoint
    const statusRes = await fetch(`${renderEngineUrl}/job-status/${jobId}`);
    if (!statusRes.ok) {
      throw new Error(
        `Render engine job-status returned ${statusRes.status} for job ${jobId}`
      );
    }
    const statusJson = await statusRes.json();

    if (statusJson.status !== "completed") {
      return NextResponse.json(
        {
          error: `Job is not completed yet (current status: ${statusJson.status ?? "unknown"})`,
        },
        { status: 409 }
      );
    }

    // Prefer Cloudinary URLs stored in Firestore (saved by the Python renderer)
    // over local static server URLs which may be auth-protected
    let rawVideoUrl: string = "";
    let rawThumbUrl: string = "";

    try {
      const firestoreDoc = await db.collection("videos").doc(jobId).get();
      if (firestoreDoc.exists) {
        const d = firestoreDoc.data() as any;
        // Use Cloudinary URL if already present in Firestore
        rawVideoUrl = d?.cloudinaryVideoUrl || d?.videoUrl || "";
        rawThumbUrl = d?.cloudinaryThumbUrl || d?.thumbnailUrl || "";
      }
    } catch {
      // Firestore unavailable — fall through to job-status URL
    }

    // Fall back to job-status URLs if Firestore had no usable URL
    if (!rawVideoUrl) {
      rawVideoUrl = statusJson.videoUrl || statusJson.output?.videoUrl || "";
    }
    if (!rawThumbUrl) {
      rawThumbUrl = statusJson.thumbnailUrl || statusJson.output?.thumbnailUrl || "";
    }

    if (!rawVideoUrl) {
      return NextResponse.json(
        { error: "No video URL found for this job in the render engine" },
        { status: 404 }
      );
    }

    // 2. Short-circuit: if already on Cloudinary, return as-is
    const alreadyOnCloudinary =
      rawVideoUrl.includes("res.cloudinary.com") ||
      rawVideoUrl.includes("cloudinary.com");

    if (alreadyOnCloudinary) {
      return NextResponse.json({
        success: true,
        videoUrl: rawVideoUrl,
        thumbnailUrl: rawThumbUrl || null,
        publicId: rawVideoUrl.split("/upload/").pop()?.replace(/^v\d+\//, "") ?? jobId,
        folder: "geo_quiz_factory",
        alreadyUploaded: true,
      });
    }

    // 3. Build Cloudinary path
    const now = new Date();
    const dateFolder = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-"); // HH-MM-SS

    // Fetch job metadata from Firestore for country / difficulty labelling
    let countryLabel = "Default";
    let difficultyLabel = "Medium";
    let versionLabel = "1";
    try {
      const jobDoc = await db.collection("videos").doc(jobId).get();
      if (jobDoc.exists) {
        const d = jobDoc.data() as any;
        if (d?.quizData?.country || d?.country)
          countryLabel = (d.quizData?.country || d.country)
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_]/g, "");
        if (d?.difficulty) difficultyLabel = d.difficulty;
        if (d?.version) versionLabel = String(d.version);
      }
    } catch {
      // Firestore lookup is optional — fall back to defaults
    }

    const folderPath = `geo_quiz_factory/${dateFolder}`;
    const publicId = `${countryLabel}_${difficultyLabel}_Batch_${versionLabel}_${timeStr}`;

    // 4. Resolve absolute source URL for the video
    // Local static paths → prepend render engine base URL
    const absoluteVideoUrl = rawVideoUrl.startsWith("http")
      ? rawVideoUrl
      : `${renderEngineUrl}${rawVideoUrl}`;

    const absoluteThumbUrl =
      rawThumbUrl && !rawThumbUrl.startsWith("http")
        ? `${renderEngineUrl}${rawThumbUrl}`
        : rawThumbUrl;

    // 5. Upload video to Cloudinary (Cloudinary fetches from URL)
    console.log(
      `[cloudinary-upload] Uploading video to ${folderPath}/${publicId} from ${absoluteVideoUrl}`
    );

    const videoUpload = await cloudinary.uploader.upload(absoluteVideoUrl, {
      resource_type: "video",
      folder: folderPath,
      public_id: publicId,
      overwrite: true,
    });

    const cloudinaryVideoUrl = videoUpload.secure_url;
    const cloudinaryPublicId = videoUpload.public_id;

    // 6. Upload thumbnail if available
    let cloudinaryThumbUrl: string | null = null;
    if (absoluteThumbUrl) {
      try {
        const thumbUpload = await cloudinary.uploader.upload(absoluteThumbUrl, {
          resource_type: "image",
          folder: folderPath,
          public_id: `${publicId}_thumb`,
          overwrite: true,
        });
        cloudinaryThumbUrl = thumbUpload.secure_url;
      } catch (thumbErr: any) {
        console.warn(
          `[cloudinary-upload] Thumbnail upload failed (non-fatal): ${thumbErr.message}`
        );
      }
    }

    // 7. Update Firestore videos document with new Cloudinary URLs
    try {
      await db.collection("videos").doc(jobId).set(
        {
          cloudinaryVideoUrl,
          cloudinaryPublicId,
          cloudinaryThumbUrl,
          cloudinaryUploadedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (fsErr: any) {
      console.warn(
        `[cloudinary-upload] Firestore update failed (non-fatal): ${fsErr.message}`
      );
    }

    return NextResponse.json({
      success: true,
      videoUrl: cloudinaryVideoUrl,
      thumbnailUrl: cloudinaryThumbUrl,
      publicId: cloudinaryPublicId,
      folder: folderPath,
    });
  } catch (err: any) {
    console.error("[cloudinary-upload] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
