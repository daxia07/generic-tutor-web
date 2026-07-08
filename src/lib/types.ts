// ---------------------------------------------------------------------------
// Shared types for the learning app
// ---------------------------------------------------------------------------

/** Parsed concept from markdown */
export interface Concept {
  id: string;
  title: string;
  difficulty: number; // 1-5
  summary: string;
  keyTerms: Record<string, string>;
  whyItMatters: string;
  interviewQuestions: string[];
  gotchas: string[];
  prerequisites: string[];
  tags: string[];
}

/** SM-2 review card */
export interface ReviewCard {
  conceptId: string;
  title: string;
  difficulty: number;
  /** 0 = unseen, 1+ = previously reviewed */
  reps: number;
  /** SM-2 ease factor */
  ef: number;
  /** SM-2 interval in days */
  interval: number;
  /** Next review date (ISO) */
  nextReview: string;
  /** Last review date (ISO) */
  lastReview: string | null;
  /** Unix timestamp when this was scheduled */
  due: number;
}

/** Progress store (persisted to JSON) */
export interface ProgressStore {
  /** Version for migrations */
  version: number;
  /** Per-concept SM-2 state */
  cards: Record<string, ReviewCard>;
  /** Session history */
  sessions: SessionRecord[];
  /** Streak tracking */
  streak: StreakState;
  /** Total XP earned */
  totalXp: number;
  /** Concepts mastered (ef >= 2.5 and interval >= 21) */
  conceptsMastered: number;
}

export interface SessionRecord {
  date: string;
  conceptsReviewed: number;
  xpEarned: number;
  mode: "learn" | "review";
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null; // ISO date
  streakHistory: string[]; // last 14 ISO dates studied
}
