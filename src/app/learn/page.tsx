import { getStore, getUnseenIds } from "@/lib/store";
import { loadAllConcepts } from "@/lib/content";
import Link from "next/link";
import { BookOpen, ArrowRight, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default function LearnPage() {
  const store = getStore();
  const concepts = loadAllConcepts();
  const unseenIds = getUnseenIds(
    store,
    concepts.map((c) => c.id)
  );

  // Sort: unseen first (by difficulty), then learning by EF, then mastered
  const sorted = [...concepts].sort((a, b) => {
    const cardA = store.cards[a.id];
    const cardB = store.cards[b.id];

    const isNewA = !cardA;
    const isNewB = !cardB;

    if (isNewA && !isNewB) return -1;
    if (!isNewA && isNewB) return 1;

    if (!cardA && !cardB) return a.difficulty - b.difficulty;
    if (!cardA || !cardB) return 0;

    const masteredA = cardA.ef >= 2.5 && cardA.interval >= 21;
    const masteredB = cardB.ef >= 2.5 && cardB.interval >= 21;
    if (masteredA && !masteredB) return 1;
    if (!masteredA && masteredB) return -1;

    return cardA.ef - cardB.ef;
  });

  const newCount = unseenIds.length;
  const masteredCount = Object.values(store.cards).filter(
    (c) => c.ef >= 2.5 && c.interval >= 21
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#4b4b4b]">Learn</h1>
        <p className="text-muted-foreground">
          {newCount} new · {masteredCount} mastered · {concepts.length} total
        </p>
      </div>

      <div className="grid gap-2">
        {sorted.map((concept) => {
          const card = store.cards[concept.id];
          const isMastered = card && card.ef >= 2.5 && card.interval >= 21;
          const isLearning = card && card.reps > 0 && !isMastered;
          const isNew = !card;

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
                    {card && card.reps > 0 && (
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{card.reps} reviews</span>
                        <span>EF {card.ef}</span>
                        <span>{card.interval}d interval</span>
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
