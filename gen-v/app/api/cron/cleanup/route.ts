import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase-admin";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: Request) {
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const snapshot = await db
      .collection("videos")
      .where("status", "==", "completed")
      .where("createdAt", "<=", fortyEightHoursAgo)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ message: "No expiring media elements located." });
    }

    const batch = db.batch();
    const targets: string[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Delete Video
      if (data.cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(data.cloudinaryPublicId, { resource_type: "video" });
        } catch (cloudinaryError: any) {
          console.error(`Failed to wipe video asset ${data.cloudinaryPublicId}:`, cloudinaryError.message);
        }
      }

      // Delete Thumbnail
      if (data.cloudinaryThumbnailPublicId) {
        try {
          await cloudinary.uploader.destroy(data.cloudinaryThumbnailPublicId, { resource_type: "image" });
        } catch (cloudinaryError: any) {
          console.error(`Failed to wipe thumbnail asset ${data.cloudinaryThumbnailPublicId}:`, cloudinaryError.message);
        }
      }

      // Delete Subtitles
      if (data.cloudinarySubtitlesPublicId) {
        try {
          await cloudinary.uploader.destroy(data.cloudinarySubtitlesPublicId, { resource_type: "raw" });
        } catch (cloudinaryError: any) {
          console.error(`Failed to wipe subtitles asset ${data.cloudinarySubtitlesPublicId}:`, cloudinaryError.message);
        }
      }

      // Pivot structural record to 'purged' without breaking baseline tracking matrices
      const docRef = db.collection("videos").doc(doc.id);
      batch.update(docRef, {
        status: "purged",
        videoUrl: null,
        thumbnailUrl: null,
        subtitlesUrl: null,
        cloudinaryPublicId: null,
        cloudinaryThumbnailPublicId: null,
        cloudinarySubtitlesPublicId: null,
      });
      targets.push(doc.id);
    }

    await batch.commit();
    return NextResponse.json({ message: "Cleanup execution complete.", processed: targets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
