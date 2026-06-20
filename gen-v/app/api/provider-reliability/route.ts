import { NextResponse } from "next/server";

import { aggregateProviderReliability } from "../../../lib/provider-telemetry";

export async function GET() {
  try {
    const rows = aggregateProviderReliability();
    return NextResponse.json({ rows, generatedAt: new Date().toISOString() }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message ?? "provider-reliability failed",
      },
      { status: 500 }
    );
  }
}

