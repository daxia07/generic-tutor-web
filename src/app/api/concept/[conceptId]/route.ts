import { NextRequest, NextResponse } from "next/server";
import { getConcept } from "@/lib/content";
import { getStore, getOrCreateCard, saveStore } from "@/lib/store";

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

  const store = getStore();
  const card = getOrCreateCard(store, conceptId, concept.title, concept.difficulty);
  saveStore(store);

  return NextResponse.json({ concept, card });
}
