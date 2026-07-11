import { NextRequest, NextResponse } from "next/server";
import { buildSession, processSessionResult } from "@/lib/session";
import type { AnswerRecord } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get("mode") as "learn" | "review") || "learn";

  try {
    const session = await buildSession(mode);
    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to build session:", error);
    return NextResponse.json(
      { error: "Failed to build session" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, answers } = body as {
      sessionId: string;
      answers: AnswerRecord[];
    };

    if (!sessionId || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "sessionId and answers array are required" },
        { status: 400 }
      );
    }

    const result = await processSessionResult(sessionId, answers);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to process session result:", error);
    return NextResponse.json(
      { error: "Failed to save session results" },
      { status: 500 }
    );
  }
}
