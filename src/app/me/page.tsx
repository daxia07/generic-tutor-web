import { db } from "@/lib/db/index";
import { streaks, stats, concepts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { StatsBar } from "@/components/StatsBar";
import LogoutButton from "@/components/LogoutButton";
import { getDataRoot } from "@/lib/paths";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const [streakRow, statsRow, allConcepts] = await Promise.all([
    db.select().from(streaks).limit(1),
    db.select().from(stats).limit(1),
    db.select().from(concepts).where(eq(concepts.topicId, "system-design")),
  ]);

  const streak = streakRow[0]?.current ?? 0;
  const longest = streakRow[0]?.longest ?? 0;
  const xp = statsRow[0]?.totalXp ?? 0;
  const mastered = allConcepts.filter((c) => c.status === "mastered").length;
  const level = Math.floor(xp / 100) + 1;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="sticky top-0 z-20 bg-white border-b-2 border-[#e5e5e5] px-4">
        <StatsBar streak={streak} xp={xp} />
      </div>

      <div className="px-4 py-6 space-y-4">
        <div className="text-center">
          <div className="text-5xl mb-2">🦉</div>
          <h1 className="text-xl font-extrabold">You + Pip</h1>
          <p className="text-sm font-semibold text-[#777]">
            Level {level} · System Design
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { v: streak, l: "Streak" },
            { v: longest, l: "Best streak" },
            { v: xp, l: "Total XP" },
            { v: mastered, l: "Mastered" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-3 text-center"
            >
              <div className="text-2xl font-extrabold text-[#58cc02]">{s.v}</div>
              <div className="text-[0.65rem] font-extrabold uppercase text-[#777]">
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-3.5 text-xs font-semibold text-[#777] space-y-1">
          <div className="font-extrabold text-[#3c3c3c] text-sm mb-1">
            Data location
          </div>
          <p>
            Content & digests:{" "}
            <code className="text-[0.65rem] break-all">{getDataRoot()}</code>
          </p>
          <p>Not tracked by git. Progress lives in Turso.</p>
        </div>

        <div className="flex justify-center pt-2">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
