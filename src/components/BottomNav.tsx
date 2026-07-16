"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/digest", label: "Digest", icon: "📥" },
  { href: "/plan", label: "Plan", icon: "🌙" },
  { href: "/me", label: "Me", icon: "👤" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // Hide bottom nav during active lessons
  if (pathname?.startsWith("/session")) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t-2 border-[#e5e5e5] bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto grid grid-cols-4 px-1 pt-1.5 pb-2">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 text-[0.65rem] font-extrabold ${
                active ? "text-[#58cc02]" : "text-[#afafaf]"
              }`}
            >
              <span className="text-[1.35rem] leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
