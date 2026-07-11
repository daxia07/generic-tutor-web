"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [logging, setLogging] = useState(false);

  async function handleLogout() {
    setLogging(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={logging}
      className="flex items-center gap-1.5 text-sm font-medium text-[#4b4b4b] hover:text-red-500 transition-colors"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">{logging ? "..." : "Logout"}</span>
    </button>
  );
}
