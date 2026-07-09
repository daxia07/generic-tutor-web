import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import { concepts, stats, streaks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { computeNextSm2 } from "@/lib/sm2";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conceptId, grade, title, difficulty } = body;

  if (!conceptId || typeof grade !== "number" || grade < 0 || grade > 5) {
    return NextResponse.json(
      { error: "conceptId (string) and grade (0-5 number) are required" },
      { status: 400 }
    );
  }

  try {
    // Ensure concept exists in DB
    const conceptRows = await db
      .select()
      .from(concepts)
      .where(eq(concepts.id, conceptId))
      .limit(1);

    let concept;
    if (conceptRows.length === 0) {
      // Create concept in DB
      await db.insert(concepts).values({
        id: conceptId,
        topicId: "system-design",
        title: title ?? conceptId,
        difficulty: difficulty ?? 3,
        summary: "",
        status: "unseen",
        ef: 2.5,
        interval: 0,
        repetitions: 0,
      });
      concept = {
        id: conceptId,
        ef: 2.5,
        interval: 0,
        repetitions: 0,
        status: "unseen",
      };
    } else {
      concept = conceptRows[0];
    }

    // Compute SM-2 update
    const nextSm2 = computeNextSm2(
      concept.ef,
      concept.interval,
      concept.repetitions,
      grade
    );

    // Update concept in DB
    await db
      .update(concepts)
      .set({
        ef: nextSm2.ef,
        interval: nextSm2.interval,
        repetitions: nextSm2.repetitions,
        nextReview: nextSm2.nextReview,
        lastGrade: grade,
        status: nextSm2.status,
      })
      .where(eq(concepts.id, conceptId));

    // XP: grade >= 3 → 10 XP, else 3 XP
    const xpEarned = grade >= 3 ? 10 : 3;

    // Update stats
    const statsRows = await db.select().from(stats).limit(1);
    if (statsRows.length > 0) {
      const newMastered = nextSm2.status === "mastered" ? 1 : 0;
      await db
        .update(stats)
        .set({
          totalXp: statsRows[0].totalXp + xpEarned,
          conceptsMastered: statsRows[0].conceptsMastered + newMastered,
        })
        .where(eq(stats.id, 1));
    }

    // Update streak
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .split("T")[0];
    const streakRows = await db.select().from(streaks).limit(1);
    const streak = streakRows[0];

    if (streak) {
      let newCurrent = streak.current;
      if (streak.lastStudyDate !== today) {
        newCurrent = streak.lastStudyDate === yesterday ? streak.current + 1 : 1;
      }
      const newLongest = Math.max(newCurrent, streak.longest);
      const history: string[] = JSON.parse(streak.streakHistory || "[]");
      if (!history.includes(today)) {
        history.push(today);
        if (history.length > 14) history.splice(0, history.length - 14);
      }

      await db
        .update(streaks)
        .set({
          current: newCurrent,
          longest: newLongest,
          lastStudyDate: today,
          streakHistory: JSON.stringify(history),
        })
        .where(eq(streaks.id, 1));
    }

    // Build updated card for response
    const card = {
      conceptId,
      title: title ?? conceptId,
      difficulty: difficulty ?? 3,
      reps: nextSm2.repetitions,
      ef: nextSm2.ef,
      interval: nextSm2.interval,
      nextReview: nextSm2.nextReview,
      lastReview: new Date().toISOString(),
      due: new Date(nextSm2.nextReview).getTime(),
    };

    // Get updated stats for response
    const updatedStats = await db.select().from(stats).limit(1);
    const updatedStreak = await db.select().from(streaks).limit(1);

    return NextResponse.json({
      card,
      xpEarned,
      totalXp: updatedStats[0]?.totalXp ?? xpEarned,
      streak: {
        currentStreak: updatedStreak[0]?.current ?? 0,
        longestStreak: updatedStreak[0]?.longest ?? 0,
        lastStudyDate: updatedStreak[0]?.lastStudyDate ?? null,
        streakHistory: JSON.parse(updatedStreak[0]?.streakHistory ?? "[]"),
      },
    });
  } catch (error) {
    console.error("Failed to grade concept:", error);
    return NextResponse.json(
      { error: "Failed to save grade" },
      { status: 500 }
    );
  }
}
