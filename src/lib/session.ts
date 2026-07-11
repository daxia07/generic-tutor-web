// ---------------------------------------------------------------------------
// Session builder — assembles questions into a guided lesson session
// ---------------------------------------------------------------------------

import { db } from "./db/index";
import { concepts, questions, sessions, topics, streaks, stats, answers } from "./db/schema";
import { eq, and, lte, sql, isNull, desc } from "drizzle-orm";
import type { SessionMetadata, Question, AnswerRecord, SessionResult } from "./types";
import { gradeFromCorrectness, computeNextSm2 } from "./sm2";

const TOPIC_ID = "system-design";

/**
 * Build a new learning session.
 * Selects 6-8 new questions + 2-3 review questions, shuffles, returns metadata.
 */
export async function buildSession(
  mode: "learn" | "review" = "learn"
): Promise<SessionMetadata> {
  const sessionId = crypto.randomUUID();

  // Get topic info
  const topic = await db.select().from(topics).where(eq(topics.id, TOPIC_ID)).limit(1);
  const topicName = topic[0]?.name ?? "System Design";

  // Get unseen/learning concepts for new questions
  const newConcepts = await db
    .select()
    .from(concepts)
    .where(
      and(
        eq(concepts.topicId, TOPIC_ID),
        sql`${concepts.status} IN ('unseen', 'learning')`
      )
    )
    .orderBy(concepts.difficulty, concepts.ef)
    .limit(5);

  // Get questions from new concepts
  const newConceptIds = newConcepts.map((c) => c.id);
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

  // Get due concepts for review questions
  const today = new Date().toISOString().split("T")[0];
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

  // Get review questions from due concepts
  const dueConceptIds = dueConcepts
    .map((c) => c.id)
    .filter((id) => !newConceptIds.includes(id)); // Don't double-dip
  let reviewQuestions: Question[] = [];
  if (dueConceptIds.length > 0) {
    const reviewQs = await db
      .select()
      .from(questions)
      .where(
        sql`${questions.conceptId} IN (${sql.join(dueConceptIds.map((id) => sql`${id}`), sql`, `)})`
      );

    reviewQuestions = reviewQs.map((q) => deserializeQuestion(q, true));
  }

  // Select and shuffle questions
  const selectedNew = shuffleArray(newQuestions).slice(0, 8);
  const selectedReview = shuffleArray(reviewQuestions).slice(0, 3);
  const allQuestions = shuffleArray([...selectedNew, ...selectedReview]);

  // If no questions available, return empty session info
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
    };
  }

  // Build learning points from new concept summaries
  const learningPoints = newConcepts
    .slice(0, 3)
    .map((c) => c.title)
    .filter(Boolean);

  // Create session record in DB
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

  // Build title
  const title = mode === "review"
    ? `${topicName} — Review Session`
    : newConcepts.length > 0
    ? `${newConcepts[0].title}${newConcepts.length > 1 ? ` & ${newConcepts.length - 1} more` : ""}`
    : `${topicName} — Review`;

  return {
    sessionId,
    title,
    summary:
      mode === "review"
        ? "Review concepts that are due for spaced repetition."
        : `Learn about ${learningPoints.join(", ")}`,
    learningPoints,
    questionCount: allQuestions.length,
    estimatedMinutes: Math.ceil(allQuestions.length * 0.6),
    reviewQuestionCount: selectedReview.length,
    questions: allQuestions,
  };
}

/**
 * Process session results — update SM-2, XP, streaks.
 */
export async function processSessionResult(
  sessionId: string,
  answerRecords: AnswerRecord[]
): Promise<SessionResult> {
  const correctCount = answerRecords.filter((a) => a.correct).length;
  const totalQuestions = answerRecords.length;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // XP: 10 per correct, 3 per incorrect
  const xpEarned = answerRecords.reduce(
    (sum, a) => sum + (a.correct ? 10 : 3),
    0
  );

  // Update each concept's SM-2 state
  const conceptsUpdated: { conceptId: string; newStatus: string }[] = [];
  const conceptIds = [...new Set(answerRecords.map((a) => a.conceptId))];

  for (const conceptId of conceptIds) {
    // Get the worst grade for this concept from this session
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

    conceptsUpdated.push({ conceptId, newStatus: nextSm2.status });
  }

  // Insert answer records
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

  // Update session record
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

  // Update streak
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

  // Update stats
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

  // Build mistakes list
  const mistakes = answerRecords
    .filter((a) => !a.correct)
    .map((a) => ({
      questionId: a.questionId,
      stem: "", // Will be filled by caller from question data
      userAnswer: a.userAnswer,
      correctAnswer: a.correctAnswer,
    }));

  // Get updated total XP
  const updatedStats = await db.select().from(stats).limit(1);

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
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    case "fill-in-blank":
      return {
        id: row.id,
        conceptId: row.conceptId,
        type: "fill-in-blank",
        stem: row.stem,
        blanks: Array.isArray(correctAnswer) ? correctAnswer.length : 1,
        answers: Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer],
        explanation: row.explanation,
        difficulty: row.difficulty,
        hint: row.hint || undefined,
        wordBank,
        isReview,
      };
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

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
