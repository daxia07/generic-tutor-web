import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Topics — subject areas (e.g., "System Design")
// ---------------------------------------------------------------------------

export const topics = sqliteTable("topics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phase: integer("phase").notNull().default(1),
  goal: text("goal"),
  deadline: text("deadline"),
  createdAt: text("created_at").notNull(),
  lastSession: text("last_session"),
});

// ---------------------------------------------------------------------------
// Concepts — single learnable units (e.g., "Caching", "CAP Theorem")
// ---------------------------------------------------------------------------

export const concepts = sqliteTable(
  "concepts",
  {
    id: text("id").primaryKey(),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    difficulty: integer("difficulty").notNull().default(3),
    summary: text("summary").notNull().default(""),
    keyTerms: text("key_terms").notNull().default("{}"), // JSON object: term → definition
    whyItMatters: text("why_it_matters").notNull().default(""),
    prerequisites: text("prerequisites").notNull().default("[]"), // JSON array
    tags: text("tags").notNull().default("[]"), // JSON array
    status: text("status").notNull().default("unseen"), // unseen/learning/reviewing/mastered
    ef: real("ef").notNull().default(2.5),
    interval: integer("interval").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    nextReview: text("next_review"),
    lastGrade: integer("last_grade"),
    filePath: text("file_path"),
  },
  (table) => ({
    topicIdIdx: index("idx_concepts_topic_id").on(table.topicId),
    nextReviewIdx: index("idx_concepts_next_review").on(table.nextReview),
    statusIdx: index("idx_concepts_status").on(table.status),
  })
);

// ---------------------------------------------------------------------------
// Questions — interactive assessment items
// ---------------------------------------------------------------------------

export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // multiple-choice / fill-in-blank / select-all / order / scenario
    stem: text("stem").notNull(),
    options: text("options").notNull().default("[]"), // JSON: [{id, text}] for MC/select-all, string[] for order
    correctAnswer: text("correct_answer").notNull(), // JSON: varies by type
    explanation: text("explanation").notNull().default(""),
    hint: text("hint"),
    wordBank: text("word_bank"), // JSON: string[] for word-bank fill-in-blank
    difficulty: integer("difficulty").notNull().default(3),
  },
  (table) => ({
    conceptIdIdx: index("idx_questions_concept_id").on(table.conceptId),
  })
);

// ---------------------------------------------------------------------------
// Sessions — guided lesson records
// ---------------------------------------------------------------------------

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id),
    mode: text("mode").notNull(), // learn / review
    source: text("source").notNull().default("web"), // web / claude-code / podcast
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    totalQuestions: integer("total_questions").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    accuracy: real("accuracy").notNull().default(0),
    xpEarned: integer("xp_earned").notNull().default(0),
    heartsRemaining: integer("hearts_remaining").notNull().default(5),
    completed: integer("completed").notNull().default(0), // 1 = completed, 0 = abandoned
    conceptsReviewed: text("concepts_reviewed").notNull().default("[]"), // JSON array
  },
  (table) => ({
    topicIdIdx: index("idx_sessions_topic_id").on(table.topicId),
  })
);

// ---------------------------------------------------------------------------
// Answers — per-question response records
// ---------------------------------------------------------------------------

export const answers = sqliteTable(
  "answers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id),
    isReview: integer("is_review").notNull().default(0), // 1 = review question, 0 = new
    correct: integer("correct").notNull(), // 1 = correct, 0 = incorrect
    userAnswer: text("user_answer").notNull(), // JSON
    correctAnswer: text("correct_answer").notNull(), // JSON
    sm2Grade: integer("sm2_grade").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    sessionIdIdx: index("idx_answers_session_id").on(table.sessionId),
    conceptIdIdx: index("idx_answers_concept_id").on(table.conceptId),
  })
);

// ---------------------------------------------------------------------------
// Streaks — daily study streak (singleton row)
// ---------------------------------------------------------------------------

export const streaks = sqliteTable("streaks", {
  id: integer("id").primaryKey().$defaultFn(() => 1),
  current: integer("current").notNull().default(0),
  longest: integer("longest").notNull().default(0),
  lastStudyDate: text("last_study_date").notNull().default(""),
  streakHistory: text("streak_history").notNull().default("[]"), // JSON: last 14 ISO dates
});

// ---------------------------------------------------------------------------
// Stats — aggregate progress (singleton row)
// ---------------------------------------------------------------------------

export const stats = sqliteTable("stats", {
  id: integer("id").primaryKey().$defaultFn(() => 1),
  totalXp: integer("total_xp").notNull().default(0),
  conceptsMastered: integer("concepts_mastered").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Digests — notes + user feedback queued for overnight processing
// ---------------------------------------------------------------------------

export const digests = sqliteTable(
  "digests",
  {
    id: text("id").primaryKey(),
    notes: text("notes").notNull(),
    feedback: text("feedback"),
    sourceType: text("source_type").notNull().default("notes"), // article | notes | transcript | debrief
    signals: text("signals").notNull().default("[]"), // JSON string[]
    status: text("status").notNull().default("inbox"), // inbox | queued | processing | done | failed
    result: text("result"), // JSON: { conceptIds, questionIds, summary, ... }
    error: text("error"),
    createdAt: text("created_at").notNull(),
    processedAt: text("processed_at"),
  },
  (table) => ({
    statusIdx: index("idx_digests_status").on(table.status),
  })
);

// ---------------------------------------------------------------------------
// Overnight runs — pipeline execution records
// ---------------------------------------------------------------------------

export const overnightRuns = sqliteTable("overnight_runs", {
  id: text("id").primaryKey(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status").notNull().default("running"), // running | success | failed
  summary: text("summary").notNull().default("{}"), // JSON
  logPath: text("log_path"),
});

// ---------------------------------------------------------------------------
// Daily plans — path plan for a calendar day (overnight output)
// ---------------------------------------------------------------------------

export const dailyPlans = sqliteTable("daily_plans", {
  id: text("id").primaryKey(), // YYYY-MM-DD
  planJson: text("plan_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
