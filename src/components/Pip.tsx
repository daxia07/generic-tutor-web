/** Pip — coach owl mascot (text/emoji v1). */

import type { ReactNode } from "react";

export function PipAvatar({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "sm" ? "w-12 h-12 text-xl" : size === "lg" ? "w-16 h-16 text-3xl" : "w-14 h-14 text-2xl";
  return (
    <div
      className={`${dim} rounded-full bg-gradient-to-br from-[#b4f06a] to-[#58cc02] border-[3px] border-[#e8f8d8] shadow-[0_3px_0_#46a302] grid place-items-center flex-shrink-0 ${className}`}
      aria-label="Pip"
    >
      <span role="img" aria-hidden>
        🦉
      </span>
    </div>
  );
}

export function PipBubble({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex-1 bg-white border-2 border-[#e5e5e5] rounded-2xl px-3.5 py-3 text-[#3c3c3c] font-bold text-[1.05rem] leading-snug ${className}`}
    >
      <span
        className="absolute left-[-10px] top-4 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-white drop-shadow-[-2px_0_0_#e5e5e5]"
        aria-hidden
      />
      {children}
    </div>
  );
}
