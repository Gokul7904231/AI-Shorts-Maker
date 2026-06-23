"use client";

import Link from "next/link";
import { 
  ArrowLeft,
  Clapperboard,
  TrendingUp,
  Trophy,
  Globe2,
  BarChart2
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";

export default function AnalyticsPage() {
  const stats = [
    {
      title: "Total Generated (30d)",
      value: "5",
      icon: Clapperboard,
      color: "text-indigo-400",
      bgClass: "bg-indigo-500/10"
    },
    {
      title: "Avg / Day",
      value: "0.2",
      icon: TrendingUp,
      color: "text-emerald-400",
      bgClass: "bg-emerald-500/10"
    },
    {
      title: "Peak Day Count",
      value: "5",
      icon: Trophy,
      color: "text-amber-500",
      bgClass: "bg-amber-500/10"
    },
    {
      title: "Regions Covered",
      value: "5",
      icon: Globe2,
      color: "text-cyan-400",
      bgClass: "bg-cyan-500/10"
    }
  ];

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50 font-body-base">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen z-0 max-h-screen overflow-y-auto">
        <TopNav title="Analytics" />
        
        <main className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-6">
          
          {/* Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-zinc-800">
            <Link 
              href="/admin" 
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold py-2 px-4 rounded-md transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" /> Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-fuchsia-500 to-orange-400 flex items-center justify-center shadow-inner">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-50">
                  Analytics Heatmap
                </h1>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">
                  30-day generation activity
                </p>
              </div>
            </div>
          </div>

          {/* Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Column: Stat Cards */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={idx}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-6">
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <div className={`text-4xl font-bold mb-2 ${stat.color} tracking-tight`}>
                      {stat.value}
                    </div>
                    <div className="text-xs font-medium text-zinc-500">
                      {stat.title}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Heatmap Area */}
            <div className="lg:col-span-3">
              <div className="h-full min-h-[500px] bg-zinc-900/30 border border-zinc-800/80 rounded-xl border-dashed flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                  <BarChart2 className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-bold text-zinc-200 tracking-tight">Heatmap Data</h3>
                <p className="text-sm text-zinc-500 mt-2 max-w-sm leading-relaxed">
                  Historical telemetry and geographical heatmap will render here.
                </p>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
