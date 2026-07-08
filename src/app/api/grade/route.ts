import { NextRequest, NextResponse } from "next/server";
import { getStore, saveStore, gradeConcept } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conceptId, grade } = body;

  if (!conceptId || typeof grade !== "number" || grade < 0 || grade > 5) {
    return NextResponse.json(
      { error: "conceptId (string) and grade (0-5 number) are required" },
      { status: 400 }
    );
  }

  const store = getStore();

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
