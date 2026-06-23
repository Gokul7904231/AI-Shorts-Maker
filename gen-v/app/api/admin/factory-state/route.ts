import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase-admin";

/**
 * GET /api/admin/factory-state
 * Fetches the current kill-switch state of the Content Factory.
 */
export async function GET() {
  try {
    const docRef = db.collection("system_config").doc("automation_state");
    const doc = await docRef.get();

    if (!doc.exists) {
      // Default to active if not initialized
      return NextResponse.json({
        isFactoryActive: true,
        lastUpdated: new Date().toISOString(),
      });
    }

    const data = doc.data() || {};
    return NextResponse.json({
      isFactoryActive: data.isFactoryActive ?? true,
      lastUpdated: data.lastUpdated ?? new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[factory-state GET] Error fetching automation state:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch automation state" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/factory-state
 * Updates the kill-switch state (isFactoryActive).
 */
export async function PATCH(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { isFactoryActive } = body;
    if (typeof isFactoryActive !== "boolean") {
      return NextResponse.json(
        { error: "Missing or invalid 'isFactoryActive' parameter (must be boolean)" },
        { status: 400 }
      );
    }

    const docRef = db.collection("system_config").doc("automation_state");
    const updatedData = {
      isFactoryActive,
      lastUpdated: new Date().toISOString(),
    };

    await docRef.set(updatedData, { merge: true });

    return NextResponse.json({
      success: true,
      ...updatedData,
    });
  } catch (err: any) {
    console.error("[factory-state PATCH] Error updating automation state:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to update automation state" },
      { status: 500 }
    );
  }
}
