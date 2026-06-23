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
      <header className="md:hidden sticky top-0 z-40 w-full h-16 bg-white/90 backdrop-blur-md border-b border-zinc-200/80 px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDrawer}
            className="p-2 -ml-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link href="/" className="flex items-center gap-2" onClick={closeDrawer}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-zinc-900 to-zinc-700 bg-clip-text text-transparent">
              ShortsFactory
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Credits Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-55 border border-purple-100 text-purple-600 text-xs font-semibold">
            <Coins className="w-3.5 h-3.5 text-purple-600" />
            <span>{creditsCount} Credits</span>
          </div>

          <div className="w-8 h-8 flex items-center justify-center">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded bg-zinc-50 border border-zinc-200">
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
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Content */}
          <aside className="relative flex flex-col w-72 max-w-xs h-full bg-white border-r border-zinc-200 p-6 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2" onClick={closeDrawer}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg text-zinc-900">ShortsFactory</span>
              </Link>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="mt-8 flex-1 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeDrawer}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-purple-50 text-purple-600 border-l-2 border-purple-600 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-purple-650" : "text-zinc-500"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Profile Footer */}
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                  <span className="text-sm font-medium text-zinc-700">Account</span>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="text-sm font-semibold text-zinc-600 hover:text-zinc-900">
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
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-zinc-200/80 p-6 flex-col justify-between z-30">
        <div className="flex flex-col flex-1">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-zinc-900 to-zinc-700 bg-clip-text text-transparent tracking-tight">
              ShortsFactory
            </span>
          </Link>

          {/* Credits Box */}
          <div className="mt-6 mx-2 p-4 rounded-2xl bg-zinc-50 border border-zinc-150 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-550" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-zinc-500 font-medium">Credits Balance</span>
              </div>
              <span className="text-[10px] font-bold text-purple-600 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100">SaaS</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 tracking-tight">
              {creditsCount} <span className="text-xs font-normal text-zinc-400">remaining</span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="mt-8 space-y-1 px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-purple-50 text-purple-600 border-l-2 border-purple-600 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-purple-600" : "text-zinc-500"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop Profile Footer */}
        <div className="pt-4 border-t border-zinc-100 mx-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-zinc-800">Creator Account</span>
                <span className="text-[10px] text-zinc-400">Workspace Active</span>
              </div>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-55 hover:bg-zinc-100 text-zinc-800 border border-zinc-200 transition-colors w-full">
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
