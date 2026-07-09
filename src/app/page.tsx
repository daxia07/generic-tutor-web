import { db } from "@/lib/db/index";
import { concepts, streaks, stats, sessions } from "@/lib/db/schema";
import { eq, and, lte, sql, desc } from "drizzle-orm";
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

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Fetch from Turso
  const topicId = "system-design";
  const today = new Date().toISOString().split("T")[0];

  const [allConcepts, streakRow, statsRow, recentSessions, dueConcepts] =
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
        .limit(5),
      db
        .select()
        .from(concepts)
        .where(
          and(
            eq(concepts.topicId, topicId),
            sql`(${concepts.status} = 'unseen' OR (${concepts.status} IN ('learning', 'reviewing') AND (${concepts.nextReview} IS NULL OR ${concepts.nextReview} <= ${today})))`
          )
        ),
    ]);

  // Also load content for concept titles that may not be in DB yet
  const contentConcepts = loadAllConcepts();

  // Compute stats
  const mastered = allConcepts.filter(
    (c) => c.status === "mastered"
  ).length;
  const totalConcepts = Math.max(allConcepts.length, contentConcepts.length);
  const overallProgress =
    totalConcepts > 0 ? Math.round((mastered / totalConcepts) * 100) : 0;
  const totalXp = statsRow[0]?.totalXp ?? 0;
  const level = Math.floor(totalXp / 100) + 1;
  const xpToNextLevel = 100 - (totalXp % 100);
  const streak = streakRow[0];
  const currentStreak = streak?.current ?? 0;
  const longestStreak = streak?.longest ?? 0;

  // Split due concepts into new and review
  const newDue = dueConcepts.filter((c) => c.status === "unseen");
  const reviewDue = dueConcepts.filter(
    (c) => c.status === "learning" || c.status === "reviewing"
  );

  // Build a lookup for concept titles from DB, fallback to content
  const conceptTitleMap = new Map<string, { title: string; difficulty: number; status: string; ef: number; interval: number; repetitions: number }>();
  for (const c of allConcepts) {
    conceptTitleMap.set(c.id, {
      title: c.title,
      difficulty: c.difficulty,
      status: c.status,
      ef: c.ef,
      interval: c.interval,
      repetitions: c.repetitions,
    });
  }
  // Add content concepts not yet in DB
  for (const c of contentConcepts) {
    if (!conceptTitleMap.has(c.id)) {
      conceptTitleMap.set(c.id, {
        title: c.title,
        difficulty: c.difficulty,
        status: "unseen",
        ef: 2.5,
        interval: 0,
        repetitions: 0,
      });
    }
  }

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
            <div className="text-3xl font-bold mt-1">{currentStreak}</div>
            <div className="text-white/70 text-xs">
              Best: {longestStreak}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#e5e5e5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[#4b4b4b]/70 text-xs font-medium uppercase tracking-wide">
              <Zap className="w-4 h-4 text-[#ff9600]" />
              XP
            </div>
            <div className="text-3xl font-bold mt-1">{totalXp}</div>
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
              Continue Learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dueConcepts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-[#58cc02]" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">Nothing due right now.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dueConcepts.slice(0, 5).map((concept) => {
                  const isNew = concept.status === "unseen";
                  return (
                    <div
                      key={concept.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div>
                        <p className="font-medium text-sm">{concept.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {isNew
                            ? "New"
                            : `${concept.repetitions} reps · ${concept.interval}d interval`}
                        </p>
                      </div>
                      <Badge
                        variant={isNew ? "default" : "secondary"}
                        className={
                          isNew
                            ? "bg-[#1cb0f6]"
                            : "bg-[#ff9600]/10 text-[#ff9600]"
                        }
                      >
                        {isNew ? "Learn" : "Review"}
                      </Badge>
                    </div>
                  );
                })}
                {dueConcepts.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    +{dueConcepts.length - 5} more due
                  </p>
                )}
              </div>
            )}
            <Link href="/session/new">
              <button className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-bold py-3 px-4 text-sm transition-colors shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]">
                Start Session ({dueConcepts.length})
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
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
            {newDue.length === 0 ? (
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
                  {newDue.length} new concept{newDue.length > 1 ? "s" : ""}{" "}
                  ready to learn
                </p>
                <div className="space-y-1.5 mb-3">
                  {newDue.slice(0, 5).map((concept) => (
                    <div key={concept.id} className="flex items-center gap-2 text-sm py-1">
                      <BookOpen className="w-3.5 h-3.5 text-[#1cb0f6]" />
                      <span>{concept.title}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        Lvl {concept.difficulty}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
            {newDue.length > 0 && (
              <Link href="/session/new">
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
            {contentConcepts.map((concept) => {
              const dbConcept = conceptTitleMap.get(concept.id);
              const status = dbConcept?.status ?? "unseen";
              const ef = dbConcept?.ef ?? 2.5;
              const interval = dbConcept?.interval ?? 0;
              const reps = dbConcept?.repetitions ?? 0;
              const isMastered = status === "mastered";
              const isLearning = status === "learning" || status === "reviewing";
              const isDue =
                (status === "learning" || status === "reviewing") &&
                dbConcept != null;

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
                    {reps > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {isMastered
                          ? `Mastered · ${interval}d interval`
                          : `${reps} reps · EF ${ef}`}
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
      {recentSessions.length > 0 && (
        <Card className="border-[#e5e5e5]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#58cc02]" />
                    <span>
                      {session.completedAt
                        ? new Date(session.completedAt).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            }
                          )
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{session.totalQuestions} questions</span>
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
