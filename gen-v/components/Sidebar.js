"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, BarChart2, Settings, Plus, PlaySquare, Hexagon } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: "Quiz Factory", href: "/", icon: PlaySquare },
    { name: "Studio", href: "/library", icon: Library },
    { name: "Analytics Heatmap", href: "/analytics", icon: BarChart2 },
    { name: "Command Center", href: "/admin", icon: Settings },
  ];

  return (
    <nav className="bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-screen sticky top-0 w-64 flex-shrink-0 z-50">
      {/* Brand */}
      <div className="p-6 pb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
          <Hexagon className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
        </div>
        <div>
          <div className="text-sm font-bold text-zinc-50 tracking-tight leading-none">ShortsFactory</div>
          <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mt-1">Pro Account</div>
        </div>
      </div>
      
      {/* CTA */}
      <div className="px-4 mb-8">
        <button className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-100 text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium active:scale-[0.98]">
          <Plus className="w-4 h-4 text-zinc-400" />
          New Project
        </button>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 px-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ease-in-out group ${
                isActive
                  ? "bg-zinc-900/80 text-emerald-400 font-semibold shadow-sm"
                  : "hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300 transition-colors"}`} />
              <span className="text-sm">{link.name}</span>
            </Link>
          );
        })}
      </div>
      
      {/* Footer Avatar */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 flex items-center gap-3">
        <img alt="User Profile" className="w-9 h-9 rounded-full border border-zinc-800 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5M3MyHHePalhDgSTA68K2LgXuL6MWFMdyyvzmxZ7-CDcF5dv0ls_NaFHNlIieq4k6pY9xQjNrt_sHaNXqjHHSWMqQKZwgRAlQ2gg-TGD50MNU-s9VAz-Wygx5_99yZWarDoiRpqaifSyyrwENMTp4B-OKcym8a5TrAE6FDDYQgnztndVUuyxcf7eH09ufPa0OFs8_z9_g5cOYnkpw95_oVfcLt1uO1FYxYGW5HU3pXrmSYUvkU8GQgy9aDkIsIzP31DmDeBNXLfVh"/>
        <div className="flex-col hidden lg:flex">
          <span className="text-xs font-semibold text-zinc-200 tracking-tight">System Admin</span>
          <span className="text-[10px] text-emerald-500 font-medium">● Connected</span>
        </div>
      </div>
    </nav>
  );
}
