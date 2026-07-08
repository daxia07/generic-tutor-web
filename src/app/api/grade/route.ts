import { NextRequest, NextResponse } from "next/server";
import {
  getStore,
  saveStore,
  gradeConcept,
  getOrCreateCard,
} from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conceptId, grade, title, difficulty } = body;

  if (!conceptId || typeof grade !== "number" || grade < 0 || grade > 5) {
    return NextResponse.json(
      { error: "conceptId (string) and grade (0-5 number) are required" },
      { status: 400 }
    );
  }

  const store = getStore();

  // In serverless environments, the card might not exist yet (different
  // function instance than the concept fetch). Create it from the client
  // data if provided.
  if (!store.cards[conceptId] && title) {
    getOrCreateCard(store, conceptId, title, difficulty ?? 3);
  }

  if (!store.cards[conceptId]) {
    return NextResponse.json(
      { error: `No card found for concept: ${conceptId}` },
      { status: 404 }
    );
  }

  const result = gradeConcept(store, conceptId, grade);
  saveStore(store);

  return NextResponse.json({
    card: result.card,
    xpEarned: result.xpEarned,
    totalXp: store.totalXp,
    streak: store.streak,
  });
}
