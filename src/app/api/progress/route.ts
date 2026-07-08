import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET() {
  const store = getStore();
  const now = Date.now();

  const cards = Object.values(store.cards);
  const dueCount = cards.filter((c) => c.due <= now).length;
  const unseenCount = cards.filter((c) => c.reps === 0).length;
  const masteredCount = cards.filter(
    (c) => c.ef >= 2.5 && c.interval >= 21
  ).length;

  return NextResponse.json({
    streak: store.streak,
    totalXp: store.totalXp,
    conceptsMastered: store.conceptsMastered,
    totalCards: cards.length,
    dueCount,
    unseenCount,
    learningCount: cards.filter((c) => c.reps > 0 && c.reps < 3).length,
    reviewingCount: cards.filter(
      (c) => c.reps >= 3 && (c.ef < 2.5 || c.interval < 21)
    ).length,
    masteredCount,
    recentSessions: store.sessions.slice(-7).reverse(),
  });
}
