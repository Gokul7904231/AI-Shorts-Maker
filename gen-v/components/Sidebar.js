"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Home, Layers, BarChart3, Settings, Menu, X, Plus } from "lucide-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      name: "Home",
      href: "/preview",
      icon: Home,
    },
    {
      name: "Templates",
      href: "/library",
      icon: Layers,
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: BarChart3,
    },
    {
      name: "Settings",
      href: "/admin",
      icon: Settings,
    },
  ];

  const toggleDrawer = () => setIsOpen(!isOpen);
  const closeDrawer = () => setIsOpen(false);

  return (
    <>
      {/* Sticky Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 w-full h-16 bg-surface-container-low border-b border-surface-container-high px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDrawer}
            className="p-2 -ml-2 rounded-lg text-on-surface-variant hover:text-on-surface"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link href="/" className="flex items-center gap-2" onClick={closeDrawer}>
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-on-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
            <span className="font-bold text-lg text-on-surface tracking-tight">
              ShortsFactory
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-xs font-semibold text-on-surface hover:text-primary">
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
          <div onClick={closeDrawer} className="fixed inset-0 bg-background/80 transition-opacity" />
          <aside className="relative flex flex-col w-64 h-full bg-surface-container-lowest border-r border-surface-container-high p-4 animate-in slide-in-from-left duration-200">
            {/* Same content as desktop */}
            <div className="flex items-center justify-between mb-8">
              <Link href="/" className="flex items-center gap-2" onClick={closeDrawer}>
                <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-on-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>
                <span className="font-bold text-lg text-on-surface tracking-tight">ShortsFactory</span>
              </Link>
              <button onClick={closeDrawer} className="p-2 text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeDrawer}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto pt-6 flex flex-col gap-4">
              <Link href="/create" className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-on-primary rounded-md font-bold text-sm hover:opacity-90 transition-opacity">
                New Project
              </Link>
              <div className="flex items-center gap-3">
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                  <span className="text-sm font-medium text-on-surface">Alex (Admin)</span>
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
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-surface border-r border-surface-container-high p-4 flex-col z-30">
        <Link href="/" className="flex items-center gap-2 mb-8 px-2">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-on-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
          <span className="font-bold text-xl text-on-surface tracking-tight">
            ShortsFactory
          </span>
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                  isActive
                    ? "text-primary border-l-2 border-primary bg-primary/5"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
                style={isActive ? { borderLeft: '3px solid var(--color-primary)', paddingLeft: '9px' } : {}}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 flex flex-col gap-6">
          <Link href="/create" className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-on-primary rounded-md font-bold text-sm hover:opacity-90 transition-opacity">
            New Project
          </Link>
          <div className="flex items-center gap-3 px-2">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface">Alex (Admin)</span>
              </div>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-semibold rounded-md bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors w-full text-center">
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
