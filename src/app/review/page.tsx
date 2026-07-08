import { getStore, getDueCards } from "@/lib/store";
import { loadAllConcepts } from "@/lib/content";
import Link from "next/link";
import { Clock, ArrowRight, Flame, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  const store = getStore();
  const concepts = loadAllConcepts();
  const dueCards = getDueCards(store);

  // Enrich due cards with concept data
  const enriched = dueCards.map((card) => {
    const concept = concepts.find((c) => c.id === card.conceptId);
    return {
      ...card,
      conceptTitle: concept?.title || card.conceptId,
      conceptDifficulty: concept?.difficulty || 3,
    };
  });

  // Group: unseen first, then by reps
  const newCards = enriched.filter((c) => c.reps === 0);
  const reviewCards = enriched.filter((c) => c.reps > 0);

  // Streak calendar - last 14 days
  const streakDays = store.streak.streakHistory;
  const today = new Date();
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4b4b4b]">Review</h1>
          <p className="text-muted-foreground">
            {enriched.length} concept{enriched.length !== 1 ? "s" : ""} due today
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#fff5e6] rounded-lg px-3 py-2">
          <Flame className="w-5 h-5 text-[#ff9600]" />
          <span className="font-bold text-[#ff9600] text-lg">
            {store.streak.currentStreak}
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
              const isToday = date === today.toISOString().split("T")[0];
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

      {enriched.length === 0 ? (
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
            <Link href="/learn">
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
              {newCards.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[#1cb0f6] uppercase tracking-wide mb-2">
                    New ({newCards.length})
                  </p>
                  {newCards.map((card) => (
                    <Link
                      key={card.conceptId}
                      href={`/learn/${card.conceptId}`}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[#f0f9ff] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#ddf4ff] flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-[#1cb0f6]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {card.conceptTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Difficulty: {card.conceptDifficulty}/5
                        </p>
                      </div>
                      <Badge className="bg-[#1cb0f6] text-xs">New</Badge>
                      <ArrowRight className="w-4 h-4 text-[#afafaf] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              )}

              {reviewCards.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#ff9600] uppercase tracking-wide mb-2">
                    Review ({reviewCards.length})
                  </p>
                  {reviewCards.map((card) => (
                    <Link
                      key={card.conceptId}
                      href={`/learn/${card.conceptId}`}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[#fff8f0] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#fff0e0] flex items-center justify-center flex-shrink-0">
                        <Flame className="w-4 h-4 text-[#ff9600]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {card.conceptTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {card.reps} reps · {card.interval}d interval · EF{" "}
                          {card.ef}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {card.interval}d
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-[#afafaf] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Start review button */}
          {enriched.length > 0 && enriched[0] && (
            <Link
              href={`/learn/${enriched[0].conceptId}`}
              className="block"
            >
              <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-bold py-4 px-4 text-base transition-colors shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]">
                Start Review Session
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          )}
        </>
      )}
    </div>
  );
}
