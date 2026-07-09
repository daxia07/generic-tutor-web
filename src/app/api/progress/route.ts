import { NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import { concepts, streaks, stats, sessions } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const topicId = "system-design";
    const today = new Date().toISOString().split("T")[0];

    const [allConcepts, streakRow, statsRow, recentSessions] =
      await Promise.all([
        db
          .select()
          .from(concepts)
          .where(eq(concepts.topicId, topicId)),
        db.select().from(streaks).limit(1),
        db.select().from(stats).limit(1),
        db
          .select()
          .from(sessions)
          .where(eq(sessions.completed, 1))
          .orderBy(desc(sessions.completedAt))
          .limit(7),
      ]);

    const dueCount = allConcepts.filter(
      (c) =>
        c.status === "unseen" ||
        ((c.status === "learning" || c.status === "reviewing") &&
          (c.nextReview === null || c.nextReview! <= today))
    ).length;

    const unseenCount = allConcepts.filter((c) => c.status === "unseen").length;
    const masteredCount = allConcepts.filter((c) => c.status === "mastered").length;
    const learningCount = allConcepts.filter((c) => c.status === "learning").length;
    const reviewingCount = allConcepts.filter((c) => c.status === "reviewing").length;
    const streak = streakRow[0];

    return NextResponse.json({
      streak: {
        currentStreak: streak?.current ?? 0,
        longestStreak: streak?.longest ?? 0,
        lastStudyDate: streak?.lastStudyDate ?? null,
        streakHistory: JSON.parse(streak?.streakHistory ?? "[]"),
      },
      totalXp: statsRow[0]?.totalXp ?? 0,
      conceptsMastered: statsRow[0]?.conceptsMastered ?? 0,
      totalCards: allConcepts.length,
      dueCount,
      unseenCount,
      learningCount,
      reviewingCount,
      masteredCount,
      recentSessions: recentSessions.map((s) => ({
        date: s.completedAt?.split("T")[0] ?? "",
        conceptsReviewed: s.totalQuestions,
        xpEarned: s.xpEarned,
        mode: s.mode as "learn" | "review",
      })),
    });
  } catch (error) {
    console.error("Failed to fetch progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}
