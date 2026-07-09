import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import { concepts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getConcept } from "@/lib/content";
import { computeNextSm2 } from "@/lib/sm2";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ conceptId: string }> }
) {
  const { conceptId } = await params;
  const concept = getConcept(conceptId);

  if (!concept) {
    return NextResponse.json(
      { error: `Concept not found: ${conceptId}` },
      { status: 404 }
    );
  }

  // Fetch concept state from Turso
  const conceptRows = await db
    .select()
    .from(concepts)
    .where(eq(concepts.id, conceptId))
    .limit(1);

  let card;
  if (conceptRows.length > 0) {
    const c = conceptRows[0];
    card = {
      conceptId: c.id,
      title: c.title,
      difficulty: c.difficulty,
      reps: c.repetitions,
      ef: c.ef,
      interval: c.interval,
      nextReview: c.nextReview ?? new Date().toISOString(),
      lastReview: null,
      due: c.status === "unseen" ? Date.now() : 0,
    };
  } else {
    // Concept not in DB yet — return default state
    card = {
      conceptId,
      title: concept.title,
      difficulty: concept.difficulty,
      reps: 0,
      ef: 2.5,
      interval: 0,
      nextReview: new Date().toISOString(),
      lastReview: null,
      due: Date.now(),
    };
  }

  return NextResponse.json({ concept, card });
}
