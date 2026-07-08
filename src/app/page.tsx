import { getStore, getDueCards, getUnseenIds } from "@/lib/store";
import { loadAllConcepts } from "@/lib/content";
import Link from "next/link";
import {
  Flame,
  Zap,
  Trophy,
  BookOpen,
  ArrowRight,
  Target,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Force dynamic — reads from filesystem
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const store = getStore();
  const concepts = loadAllConcepts();
  const dueCards = getDueCards(store, 10);
  const unseenIds = getUnseenIds(
    store,
    concepts.map((c) => c.id)
  );

  const now = Date.now();
  const allCards = Object.values(store.cards);
  const mastered = allCards.filter(
    (c) => c.ef >= 2.5 && c.interval >= 21
  ).length;
  const totalConcepts = concepts.length;
  const overallProgress =
    totalConcepts > 0 ? Math.round((mastered / totalConcepts) * 100) : 0;
  const level = Math.floor(store.totalXp / 100) + 1;
  const xpToNextLevel = 100 - (store.totalXp % 100);

  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-b from-[#58cc02] to-[#46a302] text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-white/80 text-xs font-medium uppercase tracking-wide">
              <Flame className="w-4 h-4" />
              Streak
            </div>
            <div className="text-3xl font-bold mt-1">
              {store.streak.currentStreak}
            </div>
            <div className="text-white/70 text-xs">
              Best: {store.streak.longestStreak}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#e5e5e5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[#4b4b4b]/70 text-xs font-medium uppercase tracking-wide">
              <Zap className="w-4 h-4 text-[#ff9600]" />
              XP
            </div>
            <div className="text-3xl font-bold mt-1">{store.totalXp}</div>
            <div className="text-xs text-muted-foreground">
              Level {level} · {xpToNextLevel} XP to next
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#e5e5e5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[#4b4b4b]/70 text-xs font-medium uppercase tracking-wide">
              <Trophy className="w-4 h-4 text-[#ffc800]" />
              Mastered
            </div>
            <div className="text-3xl font-bold mt-1">{mastered}</div>
            <div className="text-xs text-muted-foreground">
              of {totalConcepts} concepts
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#e5e5e5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[#4b4b4b]/70 text-xs font-medium uppercase tracking-wide">
              <Target className="w-4 h-4 text-[#1cb0f6]" />
              Progress
            </div>
            <div className="text-3xl font-bold mt-1">{overallProgress}%</div>
            <Progress value={overallProgress} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main action cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-[#e5e5e5]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-[#ff9600]" />
              Due for Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dueCards.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-[#58cc02]" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">Nothing due right now.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dueCards.slice(0, 5).map((card) => (
                  <div
                    key={card.conceptId}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div>
                      <p className="font-medium text-sm">{card.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {card.reps === 0
                          ? "New"
                          : `Interval: ${card.interval}d · EF: ${card.ef}`}
                      </p>
                    </div>
                    <Badge
                      variant={card.reps === 0 ? "default" : "secondary"}
                      className={
                        card.reps === 0
                          ? "bg-[#1cb0f6]"
                          : "bg-[#ff9600]/10 text-[#ff9600]"
                      }
                    >
                      {card.reps === 0 ? "Learn" : "Review"}
                    </Badge>
                  </div>
                ))}
                {dueCards.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    +{dueCards.length - 5} more due
                  </p>
                )}
              </div>
            )}
            {dueCards.length > 0 && (
              <Link href="/review">
                <button className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-bold py-3 px-4 text-sm transition-colors shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]">
                  Start Review ({dueCards.length})
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#e5e5e5]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-[#1cb0f6]" />
              Learn New Concepts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unseenIds.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto mb-2 text-[#ffc800]" />
                <p className="font-medium">All concepts started!</p>
                <p className="text-sm">
                  {totalConcepts} concepts in your deck.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  {unseenIds.length} new concept{unseenIds.length > 1 ? "s" : ""}{" "}
                  ready to learn
                </p>
                <div className="space-y-1.5 mb-3">
                  {unseenIds.slice(0, 5).map((id) => {
                    const concept = concepts.find((c) => c.id === id);
                    return (
                      <div key={id} className="flex items-center gap-2 text-sm py-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#1cb0f6]" />
                        <span>{concept?.title || id}</span>
                        {concept && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            Lvl {concept.difficulty}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {unseenIds.length > 0 && (
              <Link href="/learn">
                <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1cb0f6] hover:bg-[#1899d6] text-white font-bold py-3 px-4 text-sm transition-colors shadow-[0_4px_0_#1899d6] active:shadow-none active:translate-y-[2px]">
                  Start Learning
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Concept progress grid */}
      <Card className="border-[#e5e5e5]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">All Concepts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {concepts.map((concept) => {
              const card = store.cards[concept.id];
              const isMastered = card && card.ef >= 2.5 && card.interval >= 21;
              const isLearning = card && card.reps > 0 && !isMastered;
              const isDue = card && card.due <= now && !isMastered;
              const isNew = !card;

              return (
                <Link
                  key={concept.id}
                  href={`/learn/${concept.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#f0f0f0] transition-colors group"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isMastered
                        ? "bg-[#ffc800]"
                        : isLearning
                        ? "bg-[#1cb0f6]"
                        : isDue
                        ? "bg-[#ff9600]"
                        : "bg-[#e5e5e5]"
                    }`}
                  >
                    {isMastered ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : isLearning ? (
                      <Zap className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5 text-[#afafaf]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {concept.title}
                    </p>
                    {card && card.reps > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {isMastered
                          ? `Mastered · ${card.interval}d interval`
                          : `${card.reps} reps · EF ${card.ef}`}
                      </p>
                    )}
                  </div>
                  {isDue && (
                    <Badge className="bg-[#ff4b4b] text-white text-xs flex-shrink-0">
                      Due
                    </Badge>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-[#afafaf] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent sessions */}
      {store.sessions.length > 0 && (
        <Card className="border-[#e5e5e5]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {store.sessions.slice(-5).reverse().map((session) => (
                <div
                  key={session.date}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#58cc02]" />
                    <span>
                      {new Date(session.date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "short", month: "short", day: "numeric" }
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{session.conceptsReviewed} concepts</span>
                    <span className="text-[#58cc02] font-medium">
                      +{session.xpEarned} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
