"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Temporary simulated login based on export behavior
      setTimeout(() => {
        setLoading(false);
        router.push("/admin"); // Redirect to dashboard
      }, 1500);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-md font-body-base text-body-base relative z-10 w-full h-full">
      <div className="gradient-bg"></div>
      
      <main className="w-full max-w-md relative z-20">
        <div className="glass-panel rounded-xl p-xl flex flex-col gap-lg relative overflow-hidden bg-surface-container-low/50 backdrop-blur-xl border border-outline-variant shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
          
          {/* Header Section */}
          <div className="flex flex-col items-center text-center gap-sm">
            <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center mb-md">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                admin_panel_settings
              </span>
            </div>
            <h1 className="text-headline-md font-headline-md text-on-surface tracking-tight font-bold">Secure Admin Auth</h1>
            <p className="text-body-sm font-body-sm text-on-surface-variant">Sign in to ShortsFactory Pro to manage your automated pipelines.</p>
          </div>
          
          {/* Form Section */}
          <form className="flex flex-col gap-md" onSubmit={handleLogin}>
            <div className="flex flex-col gap-sm">
              <label className="text-label-mono font-label-mono text-on-surface-variant uppercase tracking-wider text-[12px] font-medium" htmlFor="email">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">
                  mail
                </span>
                <input 
                  className="input-field w-full rounded-lg pl-10 pr-4 py-3 text-body-base font-body-base placeholder:text-outline-variant focus:ring-0 focus:border-primary focus:outline-none" 
                  id="email" 
                  placeholder="admin@shortsfactory.pro" 
                  required 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-sm">
              <div className="flex justify-between items-center">
                <label className="text-label-mono font-label-mono text-on-surface-variant uppercase tracking-wider text-[12px] font-medium" htmlFor="password">Password</label>
                <a className="text-label-mono font-label-mono text-primary hover:text-primary-fixed-dim transition-colors text-[12px]" href="#">Forgot?</a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">
                  lock
                </span>
                <input 
                  className="input-field w-full rounded-lg pl-10 pr-4 py-3 text-body-base font-body-base placeholder:text-outline-variant focus:ring-0 focus:border-primary focus:outline-none" 
                  id="password" 
                  placeholder="••••••••" 
                  required 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div className="pt-sm">
              <button 
                className={`btn-primary w-full rounded-lg py-3 flex items-center justify-center gap-2 font-body-base font-bold ${loading ? 'opacity-90 pointer-events-none' : ''}`} 
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-on-primary-container/30 border-t-on-primary-container rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
          
          <div className="relative flex items-center py-sm">
            <div className="flex-grow border-t border-outline-variant/50"></div>
            <span className="flex-shrink-0 mx-4 text-label-mono font-label-mono text-on-surface-variant text-[12px]">OR</span>
            <div className="flex-grow border-t border-outline-variant/50"></div>
          </div>
          
          {/* OAuth Section */}
          <button className="btn-ghost w-full rounded-lg py-3 flex items-center justify-center gap-2 font-body-base">
            <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"></path>
            </svg>
            Sign in with Google
          </button>
          
          <div className="mt-md text-center">
            <p className="text-label-mono font-label-mono text-on-surface-variant text-[11px] opacity-60">
              By signing in, you agree to the ShortsFactory Pro <a className="underline hover:text-primary transition-colors" href="#">Terms of Service</a> and <a className="underline hover:text-primary transition-colors" href="#">Privacy Policy</a>.
            </p>
          </div>
          
        </div>
      </main>
    </div>
  );
}
