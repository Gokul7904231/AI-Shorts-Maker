import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { db } from "../../../../lib/firebase-admin";

const SESSION_COOKIE_NAME = "__session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 5; // 5 days in seconds

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }

    if (!admin.apps.length) {
      return NextResponse.json(
        { error: "Firebase Admin not initialized — check server env vars." },
        { status: 500 }
      );
    }

    // Verify the ID token and create a session cookie
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000, // milliseconds
    });

    // Log the sign-in event
    try {
      await db.collection("admin_sessions").doc(decodedToken.uid).set({
        email: decodedToken.email,
        lastLogin: new Date().toISOString(),
        uid: decodedToken.uid,
      });
    } catch {
      // Non-fatal — log but continue
      console.warn("[Auth] Could not write admin session log to Firestore");
    }

    const response = NextResponse.json({ status: "success", uid: decodedToken.uid });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[Auth] Session creation failed:", err.message);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ status: "logged_out" });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
