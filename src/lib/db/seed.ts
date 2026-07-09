// ---------------------------------------------------------------------------
// Seed script — populate Turso DB from markdown content files
// Run once (or when content changes) via: npx tsx src/lib/db/seed.ts
// ---------------------------------------------------------------------------

import { db } from "./index";
import { topics, concepts, questions, streaks, stats } from "./schema";
import { loadAllConcepts } from "../content";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Loading concepts from markdown...");
  const allConcepts = loadAllConcepts();
  console.log(`Found ${allConcepts.length} concepts`);

  // Upsert the "system-design" topic
  const topicId = "system-design";
  await db
    .insert(topics)
    .values({
      id: topicId,
      name: "System Design",
      phase: 1,
      goal: "Master system design interview concepts",
      createdAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: topics.id,
      set: { name: "System Design" },
    });
  console.log(`Upserted topic: ${topicId}`);

  // Upsert each concept and its questions
  for (const concept of allConcepts) {
    await db
      .insert(concepts)
      .values({
        id: concept.id,
        topicId,
        title: concept.title,
        difficulty: concept.difficulty,
        summary: concept.summary,
        keyTerms: JSON.stringify(concept.keyTerms),
        whyItMatters: concept.whyItMatters,
        prerequisites: JSON.stringify(concept.prerequisites),
        tags: JSON.stringify(concept.tags),
        status: "unseen",
        ef: 2.5,
        interval: 0,
        repetitions: 0,
      })
      .onConflictDoUpdate({
        target: concepts.id,
        set: {
          title: concept.title,
          difficulty: concept.difficulty,
          summary: concept.summary,
          keyTerms: JSON.stringify(concept.keyTerms),
          whyItMatters: concept.whyItMatters,
          prerequisites: JSON.stringify(concept.prerequisites),
          tags: JSON.stringify(concept.tags),
        },
      });
    console.log(`  Upserted concept: ${concept.id}`);

    // Upsert questions for this concept
    for (const q of concept.questions) {
      const qId = `${concept.id}-q${q.id.split("q").pop() || q.id}`;
      
      const options = q.type === "multiple-choice" || q.type === "select-all"
        ? JSON.stringify((q as any).options || [])
        : q.type === "order"
        ? JSON.stringify((q as any).items || [])
        : "[]";
      
      const correctAnswer = q.type === "multiple-choice"
        ? JSON.stringify((q as any).correctAnswer || "")
        : q.type === "fill-in-blank"
        ? JSON.stringify((q as any).answers || [])
        : q.type === "select-all"
        ? JSON.stringify((q as any).correctAnswers || [])
        : q.type === "order"
        ? JSON.stringify((q as any).correctOrder || [])
        : "[]";

      await db
        .insert(questions)
        .values({
          id: qId,
          conceptId: concept.id,
          type: q.type,
          stem: q.stem,
          options,
          correctAnswer,
          explanation: q.explanation,
          hint: (q as any).hint || null,
          wordBank: (q as any).wordBank ? JSON.stringify((q as any).wordBank) : null,
          difficulty: q.difficulty,
        })
        .onConflictDoUpdate({
          target: questions.id,
          set: {
            type: q.type,
            stem: q.stem,
            options,
            correctAnswer,
            explanation: q.explanation,
          },
        });
    }
    if (concept.questions.length > 0) {
      console.log(`    Upserted ${concept.questions.length} questions`);
    }
  }

  // Initialize streaks singleton
  const existingStreak = await db.select().from(streaks).limit(1);
  if (existingStreak.length === 0) {
    await db.insert(streaks).values({
      id: 1,
      current: 0,
      longest: 0,
      lastStudyDate: "",
      streakHistory: "[]",
    });
    console.log("Initialized streaks singleton");
  }

  // Initialize stats singleton
  const existingStats = await db.select().from(stats).limit(1);
  if (existingStats.length === 0) {
    await db.insert(stats).values({
      id: 1,
      totalXp: 0,
      conceptsMastered: 0,
    });
    console.log("Initialized stats singleton");
  }

  console.log("Seed complete!");
}

seed().catch(console.error);
