import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ShortsFactory — AI Geo-Quiz Content Engine",
  description: "Autonomously generate viral YouTube Shorts geo-quiz videos with AI. Powered by Groq LPU.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full bg-zinc-950 text-zinc-100 flex flex-col" suppressHydrationWarning>
        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
