import fs from "fs";
import path from "path";
import { eq, desc } from "drizzle-orm";
import { db } from "./db/index";
import { dailyPlans, overnightRuns } from "./db/schema";
import { ensureDataDirs, getPlansDir, getLogsDir } from "./paths";

export interface PathNodePlan {
  conceptId: string;
  title: string;
  kind: "new" | "review" | "chest";
  estimatedMinutes?: number;
}

export interface DailyPlan {
  date: string;
  nodes: PathNodePlan[];
  digestIdsProcessed: string[];
  notes?: string;
  generatedAt: string;
}

export async function getDailyPlan(date: string): Promise<DailyPlan | null> {
  const rows = await db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.id, date))
    .limit(1);
  if (!rows[0]) {
    // fallback to file
    const file = path.join(getPlansDir(), `${date}.json`);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf-8")) as DailyPlan;
    }
    return null;
  }
  try {
    return JSON.parse(rows[0].planJson) as DailyPlan;
  } catch {
    return null;
  }
}

export async function saveDailyPlan(plan: DailyPlan): Promise<void> {
  ensureDataDirs();
  const now = new Date().toISOString();
  await db
    .insert(dailyPlans)
    .values({
      id: plan.date,
      planJson: JSON.stringify(plan),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: dailyPlans.id,
      set: {
        planJson: JSON.stringify(plan),
        updatedAt: now,
      },
    });

  fs.writeFileSync(
    path.join(getPlansDir(), `${plan.date}.json`),
    JSON.stringify(plan, null, 2),
    "utf-8"
  );
}

export async function getLatestOvernightRun() {
  const rows = await db
    .select()
    .from(overnightRuns)
    .orderBy(desc(overnightRuns.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function startOvernightRun(id: string, logPath: string) {
  const startedAt = new Date().toISOString();
  await db.insert(overnightRuns).values({
    id,
    startedAt,
    status: "running",
    summary: "{}",
    logPath,
  });
  return { id, startedAt, logPath };
}

export async function finishOvernightRun(
  id: string,
  status: "success" | "failed",
  summary: Record<string, unknown>
) {
  await db
    .update(overnightRuns)
    .set({
      status,
      finishedAt: new Date().toISOString(),
      summary: JSON.stringify(summary),
    })
    .where(eq(overnightRuns.id, id));
}

export function createRunLogPath(runId: string): string {
  ensureDataDirs();
  return path.join(getLogsDir(), `overnight-${runId}.log`);
}
