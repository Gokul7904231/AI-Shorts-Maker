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
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 font-sans text-on-surface">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(78,222,163,0.08)_0%,transparent_70%)]" />
      </div>

      <div className="w-full max-w-[420px] bg-surface-container-high/80 backdrop-blur-xl border border-outline-variant rounded-xl p-10 shadow-2xl relative">
        {/* Logo/Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-surface-container-lowest border border-outline-variant mb-4 shadow-[0_8px_32px_rgba(78,222,163,0.15)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-on-surface text-2xl font-bold tracking-tight m-0">
            Secure Admin Auth
          </h1>
          <p className="text-on-surface-variant text-sm mt-2">Sign in to ShortsFactory Pro to manage your automated pipelines.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error/10 border border-error/30 rounded-lg py-3 px-4 mb-5 text-error text-sm text-center">
            {error}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmail} className="flex flex-col gap-4">
          <div>
            <label className="block text-on-surface-variant text-xs font-mono font-medium mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@shortsfactory.pro"
                className="w-full pl-10 pr-4 py-3 rounded-md bg-surface-container-lowest border border-outline-variant text-on-surface text-sm outline-none transition-colors focus:border-primary focus:shadow-[0_0_0_1px_rgba(78,222,163,0.5)] placeholder:text-surface-bright"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-on-surface-variant text-xs font-mono font-medium uppercase tracking-wider">
                Password
              </label>
              <a href="#" className="text-xs text-primary font-mono hover:text-primary-container transition-colors">Forgot?</a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-md bg-surface-container-lowest border border-outline-variant text-on-surface text-sm outline-none transition-colors focus:border-primary focus:shadow-[0_0_0_1px_rgba(78,222,163,0.5)] placeholder:text-surface-bright"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-md mt-2 flex items-center justify-center gap-2 text-on-primary font-bold text-sm transition-all ${
              loading ? "bg-primary/50 cursor-not-allowed" : "bg-primary hover:bg-primary-container hover:scale-[0.98] shadow-[0_4px_16px_rgba(78,222,163,0.25)]"
            }`}
          >
            {loading ? "Signing in..." : (
              <>
                Sign In
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-outline-variant" />
          <span className="text-on-surface-variant text-xs font-mono uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-outline-variant" />
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className={`w-full py-3 rounded-md border border-outline-variant bg-surface text-on-surface text-sm font-semibold flex items-center justify-center gap-3 transition-all ${
            googleLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-surface-container hover:border-outline cursor-pointer hover:scale-[0.99]"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {googleLoading ? "Signing in..." : "Sign in with Google"}
        </button>

        <p className="text-center text-on-surface-variant/70 font-mono text-[10px] mt-8">
          By signing in, you agree to the ShortsFactory Pro<br/>
          <a href="#" className="underline hover:text-primary transition-colors">Terms of Service</a> and <a href="#" className="underline hover:text-primary transition-colors">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="text-on-surface-variant font-mono text-sm">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
