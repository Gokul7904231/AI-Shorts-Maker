"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

const COUNTRY_LABELS = {
  US:"United States",GB:"United Kingdom",IN:"India",JP:"Japan",IT:"Italy",
  BR:"Brazil",DE:"Germany",FR:"France",CA:"Canada",AU:"Australia",
  MX:"Mexico",ES:"Spain",RU:"Russia",CN:"China",ZA:"South Africa",
  EG:"Egypt",SA:"Saudi Arabia",TR:"Turkey",AR:"Argentina",CO:"Colombia",
  PE:"Peru",CL:"Chile",VE:"Venezuela",SE:"Sweden",NO:"Norway",
  FI:"Finland",DK:"Denmark",NL:"Netherlands",BE:"Belgium",CH:"Switzerland",
  AT:"Austria",PL:"Poland",GR:"Greece",PT:"Portugal",CZ:"Czech Republic",
  HU:"Hungary",RO:"Romania",UA:"Ukraine",IE:"Ireland",NZ:"New Zealand",
  KR:"South Korea",SG:"Singapore",MY:"Malaysia",TH:"Thailand",ID:"Indonesia",
  PH:"Philippines",VN:"Vietnam",PK:"Pakistan",BD:"Bangladesh",NG:"Nigeria",
};

const GRADIENT_COLORS = ["#6366f1","#8b5cf6","#a78bfa","#7c3aed","#4f46e5"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(24,24,27,0.95)", border: "1px solid rgba(99,102,241,0.4)",
      borderRadius: 10, padding: "10px 14px", backdropFilter: "blur(12px)",
    }}>
      <div style={{ color: "#a1a1aa", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#e4e4e7", fontSize: 16, fontWeight: 700 }}>
        {payload[0].value} {payload[0].value === 1 ? "video" : "videos"}
      </div>
    </div>
  );
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analytics")
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalGenerated = data?.dailySeries?.reduce((s, d) => s + d.count, 0) ?? 0;
  const avgPerDay = data?.dailySeries?.length
    ? (totalGenerated / data.dailySeries.length).toFixed(1)
    : 0;
  const peakDay = data?.dailySeries?.reduce((m, d) => d.count > m.count ? d : m, { count: 0, date: "—" });

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", fontFamily: "'Inter', sans-serif", color: "#e4e4e7" }}>
      {/* Header */}
      <header style={{
        background: "rgba(9,9,11,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(63,63,70,0.6)", padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/dashboard/quiz" style={{
            color: "#71717a", textDecoration: "none", fontSize: 13,
            padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(63,63,70,0.6)",
          }}>← Dashboard</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #f59e0b, #ef4444)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>📊</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Analytics Heatmap</div>
              <div style={{ fontSize: 11, color: "#52525b" }}>30-day generation activity</div>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12, padding: "16px 20px", marginBottom: 24, color: "#f87171",
          }}>⚠️ {error}</div>
        )}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}>
            <div style={{ textAlign: "center", color: "#52525b" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div>Loading analytics…</div>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Total Generated (30d)", value: totalGenerated, icon: "🎬", color: "#6366f1" },
                { label: "Avg / Day", value: avgPerDay, icon: "📈", color: "#10b981" },
                { label: "Peak Day Count", value: peakDay?.count ?? 0, icon: "🏆", color: "#f59e0b" },
                { label: "Countries Active", value: data?.topCountries?.length ?? 0, icon: "🌍", color: "#0ea5e9" },
              ].map((card) => (
                <div key={card.label} style={{
                  background: "rgba(24,24,27,0.7)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(63,63,70,0.6)", borderRadius: 16, padding: "20px 24px",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
                  <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>{card.label}</div>
                </div>
              ))}
            </div>

            {/* Bar Chart */}
            <div style={{
              background: "rgba(24,24,27,0.7)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(63,63,70,0.6)", borderRadius: 16, padding: "24px",
              marginBottom: 32,
            }}>
              <h2 style={{ margin: "0 0 24px", fontSize: 16, fontWeight: 700, color: "#e4e4e7" }}>
                📅 Daily Generation Activity (Last 30 Days)
              </h2>
              {(data?.dailySeries ?? []).every(d => d.count === 0) ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#52525b" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <div>No generation events logged yet</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>Events are logged when you generate quiz scripts via the Preview page</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data?.dailySeries ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.4)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#52525b", fontSize: 10 }}
                      tickFormatter={d => d.slice(5)}
                    />
                    <YAxis tick={{ fill: "#52525b", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(data?.dailySeries ?? []).map((_, i) => (
                        <Cell key={i} fill={GRADIENT_COLORS[i % GRADIENT_COLORS.length]} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Country Heatmap */}
            <div style={{
              background: "rgba(24,24,27,0.7)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(63,63,70,0.6)", borderRadius: 16, padding: "24px",
            }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#e4e4e7" }}>
                🌍 Top Countries by Generations
              </h2>
              {!data?.topCountries?.length ? (
                <div style={{ textAlign: "center", padding: "32px", color: "#52525b" }}>No country data yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.topCountries.map((c, i) => {
                    const maxCount = data.topCountries[0].count;
                    const pct = maxCount > 0 ? (c.count / maxCount) * 100 : 0;
                    return (
                      <div key={c.code} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 28, textAlign: "right", fontSize: 12, color: "#52525b" }}>#{i+1}</div>
                        <div style={{ width: 36, fontSize: 12, fontWeight: 700, color: "#a1a1aa", letterSpacing: "0.05em" }}>{c.code}</div>
                        <div style={{ flex: 1, height: 8, background: "rgba(39,39,42,0.8)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{
                            width: `${pct}%`, height: "100%",
                            background: `linear-gradient(90deg, #6366f1, #8b5cf6)`,
                            borderRadius: 4, transition: "width 0.8s ease",
                          }} />
                        </div>
                        <div style={{ width: 32, textAlign: "right", fontSize: 13, fontWeight: 700, color: "#e4e4e7" }}>{c.count}</div>
                        <div style={{ width: 140, fontSize: 12, color: "#71717a" }}>{COUNTRY_LABELS[c.code] ?? c.code}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
