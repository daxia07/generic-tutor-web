import { db } from "../src/lib/db/index";
import { concepts, questions, answers } from "../src/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";

async function fetchProgress() {
  const topicId = "system-design";

  const conceptRows = await db
    .select()
    .from(concepts)
    .where(eq(concepts.topicId, topicId));

  const questionRows = await db
    .select()
    .from(questions);

  const answerStats = await db
    .select({
      questionId: answers.questionId,
      totalAttempts: sql<number>`count(*)`.as("total_attempts"),
      correctCount: sql<number>`sum(${answers.correct})`.as("correct_count"),
      avgSm2Grade: sql<number>`avg(${answers.sm2Grade})`.as("avg_sm2_grade"),
    })
    .from(answers)
    .groupBy(answers.questionId);

  const answerMap = new Map(answerStats.map((a) => [a.questionId, a]));

  const conceptData = conceptRows.map((c) => {
    const cQuestions = questionRows
      .filter((q) => q.conceptId === c.id)
      .map((q) => {
        const stats = answerMap.get(q.id);
        const totalAttempts = stats?.totalAttempts ?? 0;
        const correctCount = stats?.correctCount ?? 0;
        const accuracy = totalAttempts > 0 ? correctCount / totalAttempts : null;
        return {
          id: q.id,
          type: q.type,
          difficulty: q.difficulty,
          stem: q.stem.substring(0, 80),
          totalAttempts,
          correctCount,
          accuracy,
          avgSm2Grade: stats?.avgSm2Grade ?? null,
        };
      });

    return {
      id: c.id,
      title: c.title,
      status: c.status,
      ef: c.ef,
      interval: c.interval,
      repetitions: c.repetitions,
      lastGrade: c.lastGrade,
      questions: cQuestions,
    };
  });

  const highErrorRate: string[] = [];
  const zeroEngagement: string[] = [];
  const tooEasy: string[] = [];

  for (const c of conceptData) {
    const totalAttempts = c.questions.reduce((s, q) => s + q.totalAttempts, 0);
    if (totalAttempts === 0) {
      zeroEngagement.push(c.id);
      continue;
    }

    for (const q of c.questions) {
      if (q.totalAttempts >= 3 && q.accuracy !== null && q.accuracy < 0.4) {
        highErrorRate.push(q.id);
      }
      if (q.totalAttempts >= 3 && q.accuracy !== null && q.accuracy > 0.9) {
        tooEasy.push(q.id);
      }
    }
  }

  const totalQuestions = questionRows.length;
  const totalAnswers = answerStats.reduce((s, a) => s + a.totalAttempts, 0);
  const totalCorrect = answerStats.reduce((s, a) => s + a.correctCount, 0);

  const result = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalQuestions,
      totalAnswers,
      avgAccuracy: totalAnswers > 0 ? totalCorrect / totalAnswers : 0,
    },
    concepts: conceptData,
    needsAttention: {
      highErrorRate,
      zeroEngagement,
      tooEasy,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

fetchProgress().catch(console.error);
