import { db } from "@/lib/db/index";
import { concepts, streaks } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { loadAllConcepts } from "@/lib/content";
import Link from "next/link";
import { Clock, ArrowRight, Flame, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const topicId = "system-design";
  const today = new Date().toISOString().split("T")[0];

  // Fetch due concepts from Turso
  const dueConcepts = await db
    .select()
    .from(concepts)
    .where(
      and(
        eq(concepts.topicId, topicId),
        sql`(${concepts.status} IN ('learning', 'reviewing') AND (${concepts.nextReview} IS NULL OR ${concepts.nextReview} <= ${today}))`
      )
    );

  // Fetch streak from Turso
  const streakRows = await db.select().from(streaks).limit(1);
  const streak = streakRows[0];

  // Split into new (unseen but due) and review
  const reviewCards = dueConcepts;

  // Streak calendar - last 14 days
  const streakDays: string[] = streak
    ? JSON.parse(streak.streakHistory || "[]")
    : [];
  const todayDate = new Date();
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4b4b4b]">Review</h1>
          <p className="text-muted-foreground">
            {reviewCards.length} concept{reviewCards.length !== 1 ? "s" : ""} due today
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#fff5e6] rounded-lg px-3 py-2">
          <Flame className="w-5 h-5 text-[#ff9600]" />
          <span className="font-bold text-[#ff9600] text-lg">
            {streak?.current ?? 0}
          </span>
          <span className="text-xs text-[#ff9600]/70">day streak</span>
        </div>
      </div>

      {/* Streak calendar */}
      <Card className="border-[#e5e5e5]">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-[#4b4b4b]/60 uppercase tracking-wide mb-2">
            Last 14 Days
          </p>
          <div className="flex gap-1.5">
            {last14Days.map((date) => {
              const studied = streakDays.includes(date);
              const isToday = date === todayDate.toISOString().split("T")[0];
              const dayName = new Date(date + "T00:00:00")
                .toLocaleDateString("en-US", { weekday: "short" })
                .charAt(0);

              return (
                <div key={date} className="flex-1 text-center">
                  <div
                    className={`w-full aspect-square rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                      studied
                        ? "bg-[#58cc02] text-white"
                        : "bg-[#f0f0f0] text-[#afafaf]"
                    } ${isToday ? "ring-2 ring-[#1cb0f6] ring-offset-1" : ""}`}
                  >
                    {dayName}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {reviewCards.length === 0 ? (
        <Card className="border-[#e5e5e5]">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-[#58cc02]" />
            <p className="text-xl font-bold text-[#4b4b4b] mb-2">
              All caught up!
            </p>
            <p className="text-muted-foreground mb-4">
              No concepts are due for review. Your spaced repetition is on
              track.
            </p>
            <Link href="/session/new">
              <Button className="bg-[#1cb0f6] hover:bg-[#1899d6] text-white font-bold">
                Learn Something New
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Due concepts list */}
          <Card className="border-[#e5e5e5]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-[#ff9600]" />
                Due Concepts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-xs font-semibold text-[#ff9600] uppercase tracking-wide mb-2">
                  Review ({reviewCards.length})
                </p>
                {reviewCards.map((concept) => (
                  <Link
                    key={concept.id}
                    href={`/learn/${concept.id}`}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[#fff8f0] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#fff0e0] flex items-center justify-center flex-shrink-0">
                      <Flame className="w-4 h-4 text-[#ff9600]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{concept.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {concept.repetitions} reps · {concept.interval}d
                        interval · EF {concept.ef}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {concept.interval}d
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-[#afafaf] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Start review session button */}
          <Link href="/session/new" className="block">
            <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-bold py-4 px-4 text-base transition-colors shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]">
              Start Review Session
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </>
      )}
    </div>
  );
}
