import { db } from "@/lib/db/index";
import { concepts, streaks, stats, dailyPlans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { StatsBar } from "@/components/StatsBar";
import { PipAvatar } from "@/components/Pip";
import type { DailyPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

function parsePlan(raw: string | null | undefined): DailyPlan | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailyPlan;
  } catch {
    return null;
  }
}

export default async function HomePathPage() {
  const topicId = "system-design";
  const today = new Date().toISOString().split("T")[0];

  const [allConcepts, streakRow, statsRow, planRows] = await Promise.all([
    db.select().from(concepts).where(eq(concepts.topicId, topicId)),
    db.select().from(streaks).limit(1),
    db.select().from(stats).limit(1),
    db.select().from(dailyPlans).where(eq(dailyPlans.id, today)).limit(1),
  ]);

  const totalXp = statsRow[0]?.totalXp ?? 0;
  const currentStreak = streakRow[0]?.current ?? 0;

  const mastered = allConcepts.filter((c) => c.status === "mastered");
  const learning = allConcepts.filter(
    (c) => c.status === "learning" || c.status === "reviewing"
  );
  const due = allConcepts.filter(
    (c) =>
      (c.status === "learning" || c.status === "reviewing") &&
      (c.nextReview === null || c.nextReview <= today)
  );
  const unseen = allConcepts
    .filter((c) => c.status === "unseen")
    .sort((a, b) => a.difficulty - b.difficulty);

  const plan = parsePlan(planRows[0]?.planJson);

  // Build path nodes: prefer daily plan, else synthesize from progress
  type Node = {
    id: string;
    title: string;
    state: "done" | "current" | "locked";
    kind: "new" | "review" | "chest";
  };

  let nodes: Node[] = [];

  if (plan?.nodes?.length) {
    nodes = plan.nodes.map((n, i) => {
      const c = allConcepts.find((x) => x.id === n.conceptId);
      let state: Node["state"] = "locked";
      if (c?.status === "mastered") state = "done";
      else if (i === 0 || nodes[i - 1]?.state === "done") state = "current";
      // first incomplete becomes current
      return {
        id: n.conceptId,
        title: n.title,
        state: "locked",
        kind: n.kind,
      };
    });
    let foundCurrent = false;
    nodes = nodes.map((n) => {
      const c = allConcepts.find((x) => x.id === n.id);
      if (c?.status === "mastered") return { ...n, state: "done" as const };
      if (!foundCurrent) {
        foundCurrent = true;
        return { ...n, state: "current" as const };
      }
      return { ...n, state: "locked" as const };
    });
  } else {
    const pathConcepts = [
      ...mastered.slice(-2),
      ...due.slice(0, 2),
      ...learning.filter((c) => !due.some((d) => d.id === c.id)).slice(0, 1),
      ...unseen.slice(0, 3),
    ];
    // dedupe
    const seen = new Set<string>();
    const unique = pathConcepts.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    let foundCurrent = false;
    nodes = unique.slice(0, 6).map((c) => {
      if (c.status === "mastered") {
        return { id: c.id, title: c.title, state: "done" as const, kind: "new" as const };
      }
      if (!foundCurrent) {
        foundCurrent = true;
        return {
          id: c.id,
          title: c.title,
          state: "current" as const,
          kind:
            c.status === "unseen" ? ("new" as const) : ("review" as const),
        };
      }
      return { id: c.id, title: c.title, state: "locked" as const, kind: "new" as const };
    });
  }

  if (nodes.length === 0) {
    nodes = [
      {
        id: "_start",
        title: "Start learning",
        state: "current",
        kind: "new",
      },
    ];
  }

  const current = nodes.find((n) => n.state === "current");
  const unitTitle = current?.title ?? "System Design";
  const doneCount = nodes.filter((n) => n.state === "done").length;
  const progressPct = Math.round((doneCount / Math.max(nodes.length, 1)) * 100);

  const offsets = ["offset-left", "", "offset-right", "", "offset-left", ""] as const;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="sticky top-0 z-20 bg-white border-b-2 border-[#e5e5e5] px-4">
        <StatsBar streak={currentStreak} xp={totalXp} hearts={5} />
      </div>

      <div className="bg-gradient-to-b from-[#58cc02] to-[#46a302] text-white px-4 py-4">
        <h1 className="text-xl font-extrabold">System Design</h1>
        <p className="text-sm text-white/90 font-semibold">
          Path · {allConcepts.length} concepts · {mastered.length} mastered
        </p>
      </div>

      <div className="mx-4 -mt-2 mb-2 bg-white border-2 border-[#e5e5e5] rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-[#d7ffb8] grid place-items-center text-2xl flex-shrink-0">
          ⚡
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[0.7rem] font-extrabold uppercase tracking-wide text-[#777]">
            Today · focus
          </div>
          <div className="font-extrabold truncate">{unitTitle}</div>
          <div className="h-2.5 bg-[#e5e5e5] rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-[#58cc02] rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="relative flex-1 px-4 pt-6 pb-28">
        <div className="absolute left-1/2 top-8 bottom-32 w-1 -translate-x-1/2 bg-[#d4d4d4] rounded" />

        <div className="relative flex flex-col items-center gap-10">
          {nodes.map((node, i) => {
            const offset = offsets[i % offsets.length];
            const align =
              offset === "offset-left"
                ? "self-start ml-[12%]"
                : offset === "offset-right"
                  ? "self-end mr-[12%]"
                  : "self-center";

            const base =
              "relative z-10 w-[70px] h-[70px] rounded-full grid place-items-center text-2xl border-0 font-bold";
            const styles =
              node.state === "done"
                ? "bg-[#ffc800] shadow-[0_6px_0_#e5a500] text-white"
                : node.state === "current"
                  ? "bg-[#58cc02] shadow-[0_6px_0_#46a302] text-white animate-pulse"
                  : "bg-[#e5e5e5] shadow-[0_6px_0_#c4c4c4] text-[#aaa]";

            const icon =
              node.state === "done"
                ? "⭐"
                : node.state === "current"
                  ? "📖"
                  : node.kind === "chest"
                    ? "🏆"
                    : "🔒";

            const href =
              node.state === "locked"
                ? "#"
                : node.id === "_start"
                  ? "/session?mode=learn"
                  : `/session?conceptId=${encodeURIComponent(node.id)}&mode=learn`;

            const inner = (
              <>
                <span className={`${base} ${styles}`}>{icon}</span>
                <span
                  className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap text-[0.7rem] font-extrabold ${
                    node.state === "current" ? "text-[#46a302]" : "text-[#777]"
                  }`}
                >
                  {node.title.length > 18
                    ? node.title.slice(0, 16) + "…"
                    : node.title}
                </span>
              </>
            );

            return node.state === "locked" ? (
              <div key={node.id + i} className={`relative ${align}`}>
                {inner}
              </div>
            ) : (
              <Link key={node.id + i} href={href} className={`relative ${align}`}>
                {inner}
              </Link>
            );
          })}
        </div>

        <div className="fixed bottom-24 right-4 z-30 flex items-end gap-2 max-w-[200px]">
          <div className="bg-white border-2 border-[#e5e5e5] rounded-2xl px-3 py-2 text-xs font-bold shadow-md leading-snug">
            {current
              ? `Tap the green node — options only. Pip’s got you.`
              : `All caught up. Capture notes in Digest for tonight.`}
          </div>
          <PipAvatar size="md" />
        </div>
      </div>

      <div className="fixed bottom-[4.5rem] inset-x-0 z-20 px-4 max-w-lg mx-auto">
        <Link
          href={
            current && current.id !== "_start"
              ? `/session?conceptId=${encodeURIComponent(current.id)}&mode=learn`
              : "/session?mode=learn"
          }
          className="block w-full text-center rounded-2xl bg-[#58cc02] hover:bg-[#46a302] text-white font-extrabold py-3.5 uppercase tracking-wide shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]"
        >
          Start lesson
        </Link>
      </div>
    </div>
  );
}
