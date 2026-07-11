import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Flame, Brain, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tutor — System Design",
  description: "Duolingo-style spaced repetition for system design interviews",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f7f7f7]">
        {/* Top bar */}
        <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="max-w-4xl mx-auto flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <Brain className="w-6 h-6 text-[#58cc02]" />
              <span className="text-[#4b4b4b]">Tutor</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-sm font-medium text-[#4b4b4b] hover:text-[#58cc02] transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                href="/learn"
                className="flex items-center gap-1.5 text-sm font-medium text-[#4b4b4b] hover:text-[#58cc02] transition-colors"
              >
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">Learn</span>
              </Link>
              <Link
                href="/review"
                className="flex items-center gap-1.5 text-sm font-medium text-[#4b4b4b] hover:text-[#58cc02] transition-colors"
              >
                <Flame className="w-4 h-4" />
                <span className="hidden sm:inline">Review</span>
              </Link>
              <LogoutButton />
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
