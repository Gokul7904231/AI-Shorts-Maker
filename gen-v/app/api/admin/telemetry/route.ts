import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase-admin";

export async function GET() {
  try {
    const now = new Date();
    // Compute start date bound for the current calendar month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const snapshot = await db
      .collection("videos")
      .where("createdAt", ">=", startOfMonth)
      .get();

    let totalDurationSeconds = 0;
    let totalSizeMb = 0;
    let jobCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      totalDurationSeconds += data.renderDurationSeconds || 0;
      totalSizeMb += data.videoSizeMb || 0;
      jobCount++;
    });

    return NextResponse.json({
      month: now.toLocaleString("default", { month: "long", year: "numeric" }),
      totalRenderHours: parseFloat((totalDurationSeconds / 3600).toFixed(2)),
      totalStorageGb: parseFloat((totalSizeMb / 1024).toFixed(2)),
      totalVideosGenerated: jobCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
