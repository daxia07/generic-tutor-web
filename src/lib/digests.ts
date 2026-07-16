import fs from "fs";
import path from "path";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "./db/index";
import { digests } from "./db/schema";
import { ensureDataDirs, getDigestsDir } from "./paths";

export type DigestStatus =
  | "inbox"
  | "queued"
  | "processing"
  | "done"
  | "failed";

export type DigestSourceType =
  | "article"
  | "notes"
  | "transcript"
  | "debrief";

export interface DigestItem {
  id: string;
  notes: string;
  feedback: string | null;
  sourceType: DigestSourceType;
  signals: string[];
  status: DigestStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  processedAt: string | null;
}

function parseSignals(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function parseResult(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function rowToItem(row: typeof digests.$inferSelect): DigestItem {
  return {
    id: row.id,
    notes: row.notes,
    feedback: row.feedback,
    sourceType: (row.sourceType as DigestSourceType) || "notes",
    signals: parseSignals(row.signals),
    status: row.status as DigestStatus,
    result: parseResult(row.result),
    error: row.error,
    createdAt: row.createdAt,
    processedAt: row.processedAt,
  };
}

function mirrorToFile(item: DigestItem): void {
  ensureDataDirs();
  const filePath = path.join(getDigestsDir(), `${item.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(item, null, 2), "utf-8");
}

export async function listDigests(limit = 50): Promise<DigestItem[]> {
  const rows = await db
    .select()
    .from(digests)
    .orderBy(desc(digests.createdAt))
    .limit(limit);
  return rows.map(rowToItem);
}

export async function getDigest(id: string): Promise<DigestItem | null> {
  const rows = await db.select().from(digests).where(eq(digests.id, id)).limit(1);
  return rows[0] ? rowToItem(rows[0]) : null;
}

export async function createDigest(input: {
  notes: string;
  feedback?: string | null;
  sourceType?: DigestSourceType;
  signals?: string[];
  queue?: boolean;
}): Promise<DigestItem> {
  const notes = input.notes?.trim();
  if (!notes) throw new Error("notes are required");

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const status: DigestStatus = input.queue ? "queued" : "inbox";
  const signals = input.signals ?? [];

  await db.insert(digests).values({
    id,
    notes,
    feedback: input.feedback?.trim() || null,
    sourceType: input.sourceType || "notes",
    signals: JSON.stringify(signals),
    status,
    createdAt,
  });

  const item = (await getDigest(id))!;
  mirrorToFile(item);
  return item;
}

export async function updateDigestStatus(
  id: string,
  status: DigestStatus,
  extra?: { result?: Record<string, unknown>; error?: string | null }
): Promise<DigestItem | null> {
  const processedAt =
    status === "done" || status === "failed" || status === "processing"
      ? new Date().toISOString()
      : undefined;

  await db
    .update(digests)
    .set({
      status,
      ...(extra?.result !== undefined
        ? { result: JSON.stringify(extra.result) }
        : {}),
      ...(extra?.error !== undefined ? { error: extra.error } : {}),
      ...(processedAt && status !== "processing"
        ? { processedAt }
        : status === "processing"
          ? { processedAt: new Date().toISOString() }
          : {}),
    })
    .where(eq(digests.id, id));

  const item = await getDigest(id);
  if (item) mirrorToFile(item);
  return item;
}

export async function queueDigest(id: string): Promise<DigestItem | null> {
  const existing = await getDigest(id);
  if (!existing) return null;
  if (existing.status === "processing" || existing.status === "done") {
    return existing;
  }
  return updateDigestStatus(id, "queued");
}

export async function listQueuedDigests(): Promise<DigestItem[]> {
  const rows = await db
    .select()
    .from(digests)
    .where(inArray(digests.status, ["queued"]))
    .orderBy(digests.createdAt);
  return rows.map(rowToItem);
}

export async function digestCounts(): Promise<Record<DigestStatus, number>> {
  const rows = await db.select().from(digests);
  const counts: Record<DigestStatus, number> = {
    inbox: 0,
    queued: 0,
    processing: 0,
    done: 0,
    failed: 0,
  };
  for (const r of rows) {
    const s = r.status as DigestStatus;
    if (s in counts) counts[s]++;
  }
  return counts;
}
