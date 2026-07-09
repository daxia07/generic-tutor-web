import { db } from "@/lib/db/index";
import { concepts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { loadAllConcepts } from "@/lib/content";
import Link from "next/link";
import { BookOpen, ArrowRight, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const topicId = "system-design";

  // Fetch concept states from Turso
  const dbConcepts = await db
    .select()
    .from(concepts)
    .where(eq(concepts.topicId, topicId));

  // Build a map from DB
  const conceptStateMap = new Map<
    string,
    { status: string; ef: number; interval: number; repetitions: number }
  >();
  for (const c of dbConcepts) {
    conceptStateMap.set(c.id, {
      status: c.status,
      ef: c.ef,
      interval: c.interval,
      repetitions: c.repetitions,
    });
  }

  // Load content concepts for full data
  const contentConcepts = loadAllConcepts();

  // Enrich with DB state
  const enriched = contentConcepts.map((c) => ({
    ...c,
    dbState: conceptStateMap.get(c.id) ?? {
      status: "unseen",
      ef: 2.5,
      interval: 0,
      repetitions: 0,
    },
  }));

  // Sort: unseen first (by difficulty), then learning by EF, then mastered
  const sorted = [...enriched].sort((a, b) => {
    const stateA = a.dbState;
    const stateB = b.dbState;
    const isNewA = stateA.status === "unseen";
    const isNewB = stateB.status === "unseen";

    if (isNewA && !isNewB) return -1;
    if (!isNewA && isNewB) return 1;

    if (isNewA && isNewB) return a.difficulty - b.difficulty;

    const masteredA = stateA.status === "mastered";
    const masteredB = stateB.status === "mastered";
    if (masteredA && !masteredB) return 1;
    if (!masteredA && masteredB) return -1;

    return stateA.ef - stateB.ef;
  });

  const newCount = enriched.filter((c) => c.dbState.status === "unseen").length;
  const masteredCount = enriched.filter(
    (c) => c.dbState.status === "mastered"
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#4b4b4b]">Learn</h1>
        <p className="text-muted-foreground">
          {newCount} new · {masteredCount} mastered · {contentConcepts.length} total
        </p>
      </div>

      <div className="grid gap-2">
        {sorted.map((concept) => {
          const state = concept.dbState;
          const isMastered = state.status === "mastered";
          const isLearning = state.status === "learning" || state.status === "reviewing";
          const isNew = state.status === "unseen";

          return (
            <Link key={concept.id} href={`/learn/${concept.id}`}>
              <Card className="border-[#e5e5e5] hover:border-[#1cb0f6] hover:bg-[#f0f9ff] transition-all cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isMastered
                        ? "bg-[#fff5cc]"
                        : isLearning
                        ? "bg-[#ddf4ff]"
                        : "bg-[#f0f0f0]"
                    }`}
                  >
                    {isMastered ? (
                      <Star className="w-5 h-5 text-[#ffc800]" />
                    ) : isLearning ? (
                      <BookOpen className="w-5 h-5 text-[#1cb0f6]" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-[#afafaf]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{concept.title}</p>
                      {isNew && (
                        <Badge className="bg-[#58cc02] text-xs">New</Badge>
                      )}
                      {isMastered && (
                        <Badge className="bg-[#ffc800] text-xs">Mastered</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {concept.summary.slice(0, 100)}
                    </p>
                    {state.repetitions > 0 && (
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{state.repetitions} reviews</span>
                        <span>EF {state.ef}</span>
                        <span>{state.interval}d interval</span>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    Lvl {concept.difficulty}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-[#afafaf] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
