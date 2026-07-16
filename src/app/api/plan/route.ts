import { NextResponse } from "next/server";
import { getDailyPlan, getLatestOvernightRun } from "@/lib/plans";
import { digestCounts } from "@/lib/digests";

export const dynamic = "force-dynamic";

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const [todayPlan, tomorrowPlan, lastRun, counts] = await Promise.all([
      getDailyPlan(todayIso()),
      getDailyPlan(tomorrowIso()),
      getLatestOvernightRun(),
      digestCounts(),
    ]);

    return NextResponse.json({
      today: todayIso(),
      tomorrow: tomorrowIso(),
      todayPlan,
      tomorrowPlan,
      lastRun: lastRun
        ? {
            id: lastRun.id,
            startedAt: lastRun.startedAt,
            finishedAt: lastRun.finishedAt,
            status: lastRun.status,
            summary: (() => {
              try {
                return JSON.parse(lastRun.summary || "{}");
              } catch {
                return {};
              }
            })(),
            logPath: lastRun.logPath,
          }
        : null,
      digestCounts: counts,
      cron: {
        schedule: "0 3 * * *",
        command: "npm run overnight",
        note: "Installed via scripts/install-overnight-cron.sh",
      },
    });
  } catch (error) {
    console.error("GET /api/plan", error);
    return NextResponse.json(
      { error: "Failed to load plan" },
      { status: 500 }
    );
  }
}
