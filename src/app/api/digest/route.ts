import { NextRequest, NextResponse } from "next/server";
import {
  createDigest,
  listDigests,
  digestCounts,
  queueDigest,
  type DigestSourceType,
} from "@/lib/digests";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [items, counts] = await Promise.all([listDigests(40), digestCounts()]);
    return NextResponse.json({ items, counts });
  } catch (error) {
    console.error("GET /api/digest", error);
    return NextResponse.json(
      { error: "Failed to list digests" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const notes = String(body.notes || "").trim();
    if (!notes) {
      return NextResponse.json({ error: "notes required" }, { status: 400 });
    }

    const item = await createDigest({
      notes,
      feedback: body.feedback ? String(body.feedback) : null,
      sourceType: (body.sourceType as DigestSourceType) || "notes",
      signals: Array.isArray(body.signals)
        ? body.signals.map(String)
        : [],
      queue: Boolean(body.queue),
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("POST /api/digest", error);
    return NextResponse.json(
      { error: "Failed to create digest" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    if (body.action === "queue") {
      const item = await queueDigest(id);
      if (!item) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      return NextResponse.json(item);
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/digest", error);
    return NextResponse.json(
      { error: "Failed to update digest" },
      { status: 500 }
    );
  }
}
