"use client";
import { Moon, Zap } from "lucide-react";

export default function TopNav({ title = "Dashboard" }) {
  return (
    <header className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 flex justify-between items-center w-full px-4 sm:px-6 lg:px-8 h-16 sticky top-0 z-40 flex-shrink-0">
      <div className="text-lg font-bold text-zinc-50 tracking-tight">
        {title}
      </div>
      <div className="flex items-center gap-4">
        <button className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-all p-2 rounded-md flex items-center justify-center border border-transparent hover:border-zinc-800">
          <Moon className="w-4 h-4" />
        </button>
        <button className="bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-zinc-950 font-semibold text-xs py-2 px-4 rounded-md flex items-center gap-2 shadow-sm">
          <Zap className="w-4 h-4" fill="currentColor" />
          Quick Generate
        </button>
        <div className="h-6 w-px bg-zinc-800 mx-1"></div>
        <img alt="User Avatar" className="w-8 h-8 rounded-full border border-zinc-800 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrnFIf6xuOtGYl15UFW4zzJ8I0FqaiEkqg4mJ8PntDBglKwrucGgAbZk2l8ruFZ8ArrxH-Gbxo2YdatcCft2BbQV6eVplAA70P79ZKi6Pa4LdUw17-SPK35NEz8PxY2bBbiWuV_Gd6q8SPgjwrsgd9wf3beK5atsoAeARV10AEl1wBvRCFT7O8BTn_aP0Yn7yRCVhD64d70owy1GNwjSLzWMQFQwPaQ7py8BgtKE0a6RYYepnEWXGHhGm25vOM_GWOlgP1GbMsEElQ" />
      </div>
    </header>
  );
}
