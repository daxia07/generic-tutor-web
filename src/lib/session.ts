import { db } from "./db/index";
import { concepts, questions, sessions, topics, streaks, stats, answers } from "./db/schema";
import { eq, and, lte, sql, isNull, desc, inArray } from "drizzle-orm";
import type { SessionMetadata, Question, AnswerRecord, SessionResult } from "./types";
import { gradeFromCorrectness, computeNextSm2 } from "./sm2";

const TOPIC_ID = "system-design";

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function getMasteredConceptIds(): Promise<Set<string>> {
  const rows = await db
    .select({ id: concepts.id })
    .from(concepts)
    .where(and(eq(concepts.topicId, TOPIC_ID), eq(concepts.status, "mastered")));
  return new Set(rows.map((r) => r.id));
}

function prerequisitesMet(prereqs: string[], mastered: Set<string>): boolean {
  if (prereqs.length === 0) return true;
  return prereqs.every((p) => mastered.has(p));
}

export async function buildSession(
  mode: "learn" | "review" = "learn",
  conceptId?: string
): Promise<SessionMetadata> {
  const sessionId = crypto.randomUUID();

  const topic = await db.select().from(topics).where(eq(topics.id, TOPIC_ID)).limit(1);
  const topicName = topic[0]?.name ?? "System Design";

  let newConceptIds: string[] = [];
  let newConceptTitles: string[] = [];

  if (conceptId) {
    const target = await db
      .select()
      .from(concepts)
      .where(and(eq(concepts.topicId, TOPIC_ID), eq(concepts.id, conceptId)))
      .limit(1);

    if (target.length > 0) {
      newConceptIds = [target[0].id];
      newConceptTitles = [target[0].title];
    } else {
      const contentConcepts = await db
        .select()
        .from(concepts)
        .where(and(eq(concepts.topicId, TOPIC_ID), eq(concepts.id, conceptId)))
        .limit(1);
      if (contentConcepts.length > 0) {
        newConceptIds = [conceptId];
        newConceptTitles = [contentConcepts[0].title];
      }
    }
  } else if (mode === "learn") {
    const mastered = await getMasteredConceptIds();

    const allCandidates = await db
      .select()
      .from(concepts)
      .where(
        and(
          eq(concepts.topicId, TOPIC_ID),
          sql`${concepts.status} IN ('unseen', 'learning')`
        )
      )
      .orderBy(concepts.difficulty, concepts.ef);

    const eligible = allCandidates.filter((c) => {
      const prereqs = parseJsonArray(c.prerequisites);
      return prerequisitesMet(prereqs, mastered);
    });

    newConceptIds = eligible.slice(0, 5).map((c) => c.id);
    newConceptTitles = eligible.slice(0, 5).map((c) => c.title);
  }

  let newQuestions: Question[] = [];
  if (newConceptIds.length > 0) {
    const newQs = await db
      .select()
      .from(questions)
      .where(
        sql`${questions.conceptId} IN (${sql.join(newConceptIds.map((id) => sql`${id}`), sql`, `)})`
      );

    newQuestions = newQs.map((q) => deserializeQuestion(q, false));
  }

  const today = new Date().toISOString().split("T")[0];
  let reviewQuestions: Question[] = [];
  let dueConceptIds: string[] = [];

  if (!conceptId) {
    const dueConcepts = await db
      .select()
      .from(concepts)
      .where(
        and(
          eq(concepts.topicId, TOPIC_ID),
          sql`${concepts.status} IN ('learning', 'reviewing')`,
          sql`(${concepts.nextReview} IS NULL OR ${concepts.nextReview} <= ${today})`
        )
      )
      .orderBy(concepts.ef)
      .limit(3);

    dueConceptIds = dueConcepts
      .map((c) => c.id)
      .filter((id) => !newConceptIds.includes(id));

    if (dueConceptIds.length > 0) {
      const reviewQs = await db
        .select()
        .from(questions)
        .where(
          sql`${questions.conceptId} IN (${sql.join(dueConceptIds.map((id) => sql`${id}`), sql`, `)})`
        );

      reviewQuestions = reviewQs.map((q) => deserializeQuestion(q, true));
    }
  }

  const selectedNew = shuffleArray(newQuestions).slice(0, 8);
  const selectedReview = shuffleArray(reviewQuestions).slice(0, 3);
  const allQuestions = shuffleArray([...selectedNew, ...selectedReview]);

  if (allQuestions.length === 0) {
    return {
      sessionId,
      title: `${topicName} — Review`,
      summary: "Review previously studied concepts.",
      learningPoints: [],
      questionCount: 0,
      estimatedMinutes: 0,
      reviewQuestionCount: 0,
      questions: [],
      nextConceptId: null,
      nextConceptTitle: null,
    };
  }

  const learningPoints = newConceptTitles.slice(0, 3).filter(Boolean);

  await db.insert(sessions).values({
    id: sessionId,
    topicId: TOPIC_ID,
    mode,
    source: "web",
    startedAt: new Date().toISOString(),
    totalQuestions: allQuestions.length,
    conceptsReviewed: JSON.stringify(
      [...new Set(allQuestions.map((q) => q.conceptId))]
    ),
  });

  const title =
    conceptId && newConceptTitles.length === 1
      ? newConceptTitles[0]
      : mode === "review"
        ? `${topicName} — Review Session`
        : newConceptTitles.length > 0
          ? `${newConceptTitles[0]}${newConceptTitles.length > 1 ? ` & ${newConceptTitles.length - 1} more` : ""}`
          : `${topicName} — Review`;

  const nextConcept = await getNextAvailableConcept(newConceptIds);

  return {
    sessionId,
    title,
    summary:
      conceptId
        ? `Master ${learningPoints.join(", ")}`
        : mode === "review"
          ? "Review concepts that are due for spaced repetition."
          : `Learn about ${learningPoints.join(", ")}`,
    learningPoints,
    questionCount: allQuestions.length,
    estimatedMinutes: Math.ceil(allQuestions.length * 0.6),
    reviewQuestionCount: selectedReview.length,
    questions: allQuestions,
    nextConceptId: nextConcept?.id ?? null,
    nextConceptTitle: nextConcept?.title ?? null,
  };
}

async function getNextAvailableConcept(
  justStudiedIds: string[]
): Promise<{ id: string; title: string } | null> {
  const mastered = await getMasteredConceptIds();

  for (const id of justStudiedIds) {
    mastered.add(id);
  }

  const candidates = await db
    .select({ id: concepts.id, title: concepts.title, prerequisites: concepts.prerequisites, difficulty: concepts.difficulty })
    .from(concepts)
    .where(
      and(
        eq(concepts.topicId, TOPIC_ID),
        sql`${concepts.status} IN ('unseen', 'learning')`
      )
    )
    .orderBy(concepts.difficulty, concepts.ef);

  const next = candidates.find((c) => {
    if (justStudiedIds.includes(c.id)) return false;
    const prereqs = parseJsonArray(c.prerequisites);
    return prerequisitesMet(prereqs, mastered);
  });

  return next ? { id: next.id, title: next.title } : null;
}

export async function processSessionResult(
  sessionId: string,
  answerRecords: AnswerRecord[]
): Promise<SessionResult> {
  const correctCount = answerRecords.filter((a) => a.correct).length;
  const totalQuestions = answerRecords.length;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const xpEarned = answerRecords.reduce(
    (sum, a) => sum + (a.correct ? 10 : 3),
    0
  );

  const conceptsUpdated: { conceptId: string; newStatus: string; title: string }[] = [];
  const conceptIds = [...new Set(answerRecords.map((a) => a.conceptId))];

  for (const conceptId of conceptIds) {
    const conceptAnswers = answerRecords.filter((a) => a.conceptId === conceptId);
    const worstGrade = Math.min(...conceptAnswers.map((a) => a.sm2Grade));

    const conceptRows = await db
      .select()
      .from(concepts)
      .where(eq(concepts.id, conceptId))
      .limit(1);

    if (conceptRows.length === 0) continue;
    const concept = conceptRows[0];

    const nextSm2 = computeNextSm2(
      concept.ef,
      concept.interval,
      concept.repetitions,
      worstGrade
    );

    await db
      .update(concepts)
      .set({
        ef: nextSm2.ef,
        interval: nextSm2.interval,
        repetitions: nextSm2.repetitions,
        nextReview: nextSm2.nextReview,
        lastGrade: worstGrade,
        status: nextSm2.status,
      })
      .where(eq(concepts.id, conceptId));

    conceptsUpdated.push({ conceptId, newStatus: nextSm2.status, title: concept.title });
  }

  for (const answer of answerRecords) {
    await db.insert(answers).values({
      sessionId,
      questionId: answer.questionId,
      conceptId: answer.conceptId,
      isReview: answer.isReview ? 1 : 0,
      correct: answer.correct ? 1 : 0,
      userAnswer: answer.userAnswer,
      correctAnswer: answer.correctAnswer,
      sm2Grade: answer.sm2Grade,
      createdAt: new Date().toISOString(),
    });
  }

  await db
    .update(sessions)
    .set({
      completedAt: new Date().toISOString(),
      correctCount,
      accuracy,
      xpEarned,
      heartsRemaining: 5,
      completed: 1,
    })
    .where(eq(sessions.id, sessionId));

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
  const streakRows = await db.select().from(streaks).limit(1);
  const streak = streakRows[0];
  let streakUpdated = false;

  if (streak) {
    let newCurrent = streak.current;
    if (streak.lastStudyDate !== today) {
      if (streak.lastStudyDate === yesterday) {
        newCurrent = streak.current + 1;
      } else {
        newCurrent = 1;
      }
      streakUpdated = true;
    }

    const newLongest = Math.max(newCurrent, streak.longest);
    const history: string[] = JSON.parse(streak.streakHistory || "[]");
    if (!history.includes(today)) {
      history.push(today);
      if (history.length > 14) history.splice(0, history.length - 14);
    }

    await db
      .update(streaks)
      .set({
        current: newCurrent,
        longest: newLongest,
        lastStudyDate: today,
        streakHistory: JSON.stringify(history),
      })
      .where(eq(streaks.id, 1));
  }

  const statsRows = await db.select().from(stats).limit(1);
  const currentStats = statsRows[0];
  const newMastered = conceptsUpdated.filter((c) => c.newStatus === "mastered").length;

  if (currentStats) {
    await db
      .update(stats)
      .set({
        totalXp: currentStats.totalXp + xpEarned,
        conceptsMastered: currentStats.conceptsMastered + newMastered,
      })
      .where(eq(stats.id, 1));
  }

  const mistakes = answerRecords
    .filter((a) => !a.correct)
    .map((a) => ({
      questionId: a.questionId,
      stem: "",
      userAnswer: a.userAnswer,
      correctAnswer: a.correctAnswer,
    }));

  const updatedStats = await db.select().from(stats).limit(1);

  const nextConcept = await getNextAvailableConcept(conceptIds);

  return {
    sessionId,
    xpEarned,
    accuracy,
    correctCount,
    totalQuestions,
    conceptsUpdated,
    streakUpdated,
    totalXp: updatedStats[0]?.totalXp ?? xpEarned,
    mistakes,
    nextConceptId: nextConcept?.id ?? null,
    nextConceptTitle: nextConcept?.title ?? null,
  };
}

function deserializeQuestion(
  row: any,
  isReview: boolean
): Question {
  const type = row.type as Question["type"];
  const options = JSON.parse(row.options || "[]");
  const correctAnswer = JSON.parse(row.correctAnswer || "[]");
  const wordBank = row.wordBank ? JSON.parse(row.wordBank) : undefined;

  switch (type) {
    case "multiple-choice":
      return {
        id: row.id,
        conceptId: row.conceptId,
        type: "multiple-choice",
        stem: row.stem,
        options,
        correctAnswer: typeof correctAnswer === "string" ? correctAnswer : correctAnswer[0] || "",
        explanation: row.explanation,
        difficulty: row.difficulty,
        isReview,
      };
    case "fill-in-blank": {
      const blankCount = (row.stem.match(/_{2,}/g) || []).length || 1;
      let parsedAnswers: string[][];
      if (Array.isArray(correctAnswer) && Array.isArray(correctAnswer[0])) {
        parsedAnswers = (correctAnswer as string[][]).map(arr => arr.map(stripQuotes));
      } else if (Array.isArray(correctAnswer)) {
        if (blankCount === 1) {
          parsedAnswers = [correctAnswer.map((a: string) => stripQuotes(String(a)))];
        } else {
          parsedAnswers = correctAnswer.map((a: string) => [stripQuotes(String(a))]);
        }
      } else {
        parsedAnswers = [[stripQuotes(String(correctAnswer))]];
      }
      return {
        id: row.id,
        conceptId: row.conceptId,
        type: "fill-in-blank",
        stem: row.stem,
        blanks: blankCount,
        answers: parsedAnswers,
        explanation: row.explanation,
        difficulty: row.difficulty,
        hint: row.hint || undefined,
        wordBank,
        isReview,
      };
    }
    case "select-all":
      return {
        id: row.id,
        conceptId: row.conceptId,
        type: "select-all",
        stem: row.stem,
        options,
        correctAnswers: Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer],
        explanation: row.explanation,
        difficulty: row.difficulty,
        isReview,
      };
    case "order":
      return {
        id: row.id,
        conceptId: row.conceptId,
        type: "order",
        stem: row.stem,
        items: Array.isArray(options) ? options : [],
        correctOrder: Array.isArray(correctAnswer) ? correctAnswer.map(Number) : [],
        explanation: row.explanation,
        difficulty: row.difficulty,
        isReview,
      };
    case "scenario":
      return {
        id: row.id,
        conceptId: row.conceptId,
        type: "scenario",
        stem: row.stem,
        options,
        correctAnswer: typeof correctAnswer === "string" ? correctAnswer : correctAnswer[0] || "",
        explanation: row.explanation,
        difficulty: row.difficulty,
        isReview,
        tradeOffs: row.hint || undefined,
      };
    default:
      return {
        id: row.id,
        conceptId: row.conceptId,
        type: "multiple-choice",
        stem: row.stem,
        options: [],
        correctAnswer: "",
        explanation: row.explanation,
        difficulty: row.difficulty,
        isReview,
      };
  }
}

function stripQuotes(s: string): string {
  return s.replace(/^["']+|["']+$/g, "");
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
