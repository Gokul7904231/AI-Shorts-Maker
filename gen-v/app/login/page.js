"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../../lib/firebase-client";

function mapFirebaseError(code, fallbackMessage) {
  switch (code) {
    case "auth/configuration-not-found":
      return "This login method is disabled. The admin must enable it in the Firebase Console.";
    case "auth/user-not-found":
    case "auth/invalid-email":
    case "auth/invalid-credential":
      return "Invalid admin credentials. Please try again.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed before completion.";
    case "auth/too-many-requests":
      return "Access temporarily blocked due to many failed attempts. Try again later.";
    default:
      return fallbackMessage || "Authentication failed. Please check your credentials.";
  }
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") ?? "/dashboard/quiz";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSession(idToken) {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Session creation failed");
    }
  }

  async function handleEmail(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!auth) throw new Error("Firebase auth not initialized");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      await handleSession(token);
      router.push(redirectTo);
    } catch (err) {
      console.error("[Email Login Error]", err);
      setError(mapFirebaseError(err.code, err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      if (!auth) throw new Error("Firebase auth not initialized");
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const token = await cred.user.getIdToken();
      await handleSession(token);
      router.push(redirectTo);
    } catch (err) {
      console.error("[Google Login Error]", err);
      setError(mapFirebaseError(err.code, err.message));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
        }} />
      </div>

      <div style={{
        width: "100%", maxWidth: 420,
        background: "rgba(24,24,27,0.85)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(63,63,70,0.8)",
        borderRadius: 20,
        padding: "40px 36px",
        boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
        position: "relative",
      }}>
        {/* Logo/Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            marginBottom: 16,
            boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
          }}>
            <span style={{ fontSize: 28 }}>⚡</span>
          </div>
          <h1 style={{ color: "#fafafa", fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", margin: 0 }}>
            ShortsFactory Pro
          </h1>
          <p style={{ color: "#71717a", fontSize: 14, marginTop: 6 }}>Admin Access Only</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10, padding: "12px 16px", marginBottom: 20,
            color: "#f87171", fontSize: 13, textAlign: "center",
          }}>
            {error}
          </div>
        )}

        {/* Google Button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{
            width: "100%", padding: "13px 20px", borderRadius: 12,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            color: "#e4e4e7", fontSize: 15, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            transition: "all 0.2s", marginBottom: 20,
            opacity: googleLoading ? 0.6 : 1,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {googleLoading ? "Signing in..." : "Continue with Google"}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(63,63,70,0.8)" }} />
          <span style={{ color: "#52525b", fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(63,63,70,0.8)" }} />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", color: "#a1a1aa", fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 10, boxSizing: "border-box",
                background: "rgba(39,39,42,0.8)", border: "1px solid rgba(63,63,70,0.8)",
                color: "#e4e4e7", fontSize: 14, outline: "none", transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "rgba(63,63,70,0.8)"}
            />
          </div>
          <div>
            <label style={{ display: "block", color: "#a1a1aa", fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 10, boxSizing: "border-box",
                background: "rgba(39,39,42,0.8)", border: "1px solid rgba(63,63,70,0.8)",
                color: "#e4e4e7", fontSize: 14, outline: "none", transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "rgba(63,63,70,0.8)"}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "13px 20px", borderRadius: 12, marginTop: 4,
              background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none", color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
              boxShadow: loading ? "none" : "0 4px 16px rgba(99,102,241,0.4)",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#3f3f46", fontSize: 12, marginTop: 24 }}>
          Protected access • ShortsFactory Pro
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{
          minHeight: "100vh", background: "#09090b",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ color: "#52525b", fontFamily: "monospace", fontSize: 13 }}>Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
