"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Video, History, BarChart3, Coins, Menu, X, Sparkles } from "lucide-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      name: "Create Video",
      href: "/",
      icon: Video,
    },
    {
      name: "Recent Renders",
      href: "/recent-renders",
      icon: History,
    },
    {
      name: "Admin Dashboard",
      href: "/dashboard/admin",
      icon: BarChart3,
    },
  ];

  const toggleDrawer = () => setIsOpen(!isOpen);
  const closeDrawer = () => setIsOpen(false);

  const creditsCount = 30; // Placeholder for credits. Will be wired up to context or DB later.

  return (
    <>
      {/* Sticky Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 w-full h-16 bg-surface-container-low/90 backdrop-blur-md border-b border-outline-variant px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDrawer}
            className="p-2 -ml-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link href="/" className="flex items-center gap-2" onClick={closeDrawer}>
            <div className="w-8 h-8 rounded-lg bg-surface-container-lowest border border-outline-variant flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-lg text-on-surface tracking-tight">
              ShortsFactory
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Credits Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-semibold tracking-wide">
            <Coins className="w-3.5 h-3.5" />
            <span>{creditsCount} Credits</span>
          </div>

          <div className="w-8 h-8 flex items-center justify-center">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-xs font-semibold text-on-surface hover:text-primary px-3 py-1.5 rounded-md bg-surface-container border border-outline-variant">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Slide-over */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            onClick={closeDrawer}
            className="fixed inset-0 bg-surface/80 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Content */}
          <aside className="relative flex flex-col w-72 max-w-xs h-full bg-surface-container border-r border-outline-variant p-6 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2" onClick={closeDrawer}>
                <div className="w-8 h-8 rounded-lg bg-surface-container-lowest border border-outline-variant flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <span className="font-bold text-lg text-on-surface tracking-tight">ShortsFactory</span>
              </Link>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="mt-8 flex-1 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeDrawer}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-on-surface-variant"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Profile Footer */}
            <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                  <span className="text-sm font-medium text-on-surface">Account</span>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="text-sm font-semibold text-on-surface-variant hover:text-on-surface">
                      Sign In
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-surface-container-lowest border-r border-outline-variant p-6 flex-col justify-between z-30">
        <div className="flex flex-col flex-1">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 px-2">
            <div className="w-9 h-9 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center shadow-lg shadow-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-xl text-on-surface tracking-tight">
              ShortsFactory
            </span>
          </Link>

          {/* Credits Box */}
          <div className="mt-8 mx-2 p-5 rounded-xl bg-surface-container-high border border-outline-variant shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(78,222,163,0.1)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-primary" />
                <span className="text-xs text-on-surface-variant font-mono uppercase tracking-wider font-semibold">Balance</span>
              </div>
              <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">PRO</span>
            </div>
            <div className="mt-3 text-3xl font-mono font-bold text-on-surface tracking-tight relative z-10">
              {creditsCount} <span className="text-xs font-sans font-normal text-on-surface-variant">remaining</span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="mt-8 space-y-1.5 px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary/10 text-primary shadow-[inset_2px_0_0_0_rgba(78,222,163,1)]"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-on-surface-variant"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop Profile Footer */}
        <div className="pt-5 border-t border-outline-variant mx-1 flex items-center justify-between">
          <div className="flex items-center gap-3 w-full">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface">Creator Account</span>
                <span className="text-[10px] text-primary font-mono">Workspace Active</span>
              </div>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2.5 text-sm font-semibold rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant transition-colors w-full text-center">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </aside>
    </>
  );
}
