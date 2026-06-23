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
  const redirectTo = searchParams?.get("redirect") ?? "/preview";

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
    <div className="min-h-screen flex items-center justify-center px-4 font-sans bg-[#8a8d91]">
      <div className="w-full max-w-[360px] relative">
        {/* Logo/Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-[#1c1f26] mb-4 shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d285" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
          <h1 className="text-white text-xl font-medium tracking-tight m-0">
            Secure Admin Auth
          </h1>
          <p className="text-gray-200 text-xs mt-1">Sign in to your ShortsFactory account to manage your pipelines.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded py-2 px-3 mb-4 text-red-500 text-xs text-center">
            {error}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <div>
            <label className="block text-white text-[10px] font-bold mb-1 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@shortsfactory.pro"
                className="w-full pl-9 pr-3 py-2.5 rounded bg-white text-gray-900 text-sm outline-none placeholder:text-gray-400 border border-transparent focus:border-[#00d285]"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-white text-[10px] font-bold uppercase tracking-wider">
                Password
              </label>
              <a href="#" className="text-[10px] text-[#00d285] hover:underline">Forgot?</a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded bg-white text-gray-900 text-sm outline-none placeholder:text-gray-400 border border-transparent focus:border-[#00d285]"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 mt-2 flex items-center justify-center gap-2 text-white font-bold text-sm transition-all ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:text-[#00d285]"
            }`}
          >
            {loading ? "Signing in..." : (
              <>
                Sign in <span className="text-lg leading-none">→</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-white/60 text-[10px] uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className={`w-full py-2.5 rounded bg-transparent text-white text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            googleLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-white/10"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {googleLoading ? "Signing in..." : "Sign in with Google"}
        </button>

        <p className="text-center text-white/50 text-[10px] mt-8">
          By signing in, you agree to the ShortsFactory Pro<br/>
          <a href="#" className="underline hover:text-white transition-colors">Terms of Service</a> and <a href="#" className="underline hover:text-white transition-colors">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#8a8d91] flex items-center justify-center">
          <div className="text-white text-sm">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
