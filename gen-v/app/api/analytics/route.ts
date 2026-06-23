import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch generation logs from the last 30 days
    const snapshot = await db
      .collection("generation_logs")
      .where("timestamp", ">=", thirtyDaysAgo.toISOString())
      .orderBy("timestamp", "desc")
      .limit(500)
      .get();

    const logs = snapshot.docs.map((doc) => doc.data());

    // Aggregate: count by day
    const dailyCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};

    for (const log of logs) {
      const day = (log.timestamp as string)?.slice(0, 10);
      if (day) {
        dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
      }
      const cc = log.countryCode as string;
      if (cc) {
        countryCounts[cc] = (countryCounts[cc] ?? 0) + 1;
      }
    }

    // Build sorted daily series (fill missing days with 0)
    const dailySeries: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      dailySeries.push({ date: dateStr, count: dailyCounts[dateStr] ?? 0 });
    }

    // Top countries
    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([code, count]) => ({ code, count }));

    return NextResponse.json({
      totalLogs: logs.length,
      dailySeries,
      topCountries,
    });
  } catch (err: any) {
    console.error("[Analytics API]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
