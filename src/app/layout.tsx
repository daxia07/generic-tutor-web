import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Flame, Brain, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import SWRegister from "@/components/SWRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#58cc02",
};

export const metadata: Metadata = {
  title: "Tutor — System Design",
  description: "Duolingo-style spaced repetition for system design interviews",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tutor",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
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
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col bg-[#f7f7f7] overscroll-none">
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

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          {children}
        </main>

        <SWRegister />
      </body>
    </html>
  );
}
