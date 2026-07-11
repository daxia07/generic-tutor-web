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
  questions: Question[];
}

/** SM-2 review card (kept for backward compat, will be replaced by DB reads) */
export interface ReviewCard {
  conceptId: string;
  title: string;
  difficulty: number;
  reps: number;
  ef: number;
  interval: number;
  nextReview: string;
  lastReview: string | null;
  due: number;
}

/** Progress store (kept for backward compat, will be replaced by Turso) */
export interface ProgressStore {
  version: number;
  cards: Record<string, ReviewCard>;
  sessions: SessionRecord[];
  streak: StreakState;
  totalXp: number;
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
  lastStudyDate: string | null;
  streakHistory: string[];
}

// ---------------------------------------------------------------------------
// Question types for Duolingo-style sessions
// ---------------------------------------------------------------------------

export type QuestionType = "multiple-choice" | "fill-in-blank" | "select-all" | "order" | "scenario";

export interface BaseQuestion {
  id: string;
  conceptId: string;
  type: QuestionType;
  stem: string;
  explanation: string;
  difficulty: number;
  isReview?: boolean;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "multiple-choice";
  options: { id: string; text: string }[];
  correctAnswer: string; // option id
}

export interface FillInBlankQuestion extends BaseQuestion {
  type: "fill-in-blank";
  blanks: number;
  answers: string[][]; // answers[blankIndex] = list of acceptable alternatives
  hint?: string;
  wordBank?: string[];
}

export interface SelectAllQuestion extends BaseQuestion {
  type: "select-all";
  options: { id: string; text: string }[];
  correctAnswers: string[]; // option ids
}

export interface OrderQuestion extends BaseQuestion {
  type: "order";
  items: string[];
  correctOrder: number[]; // indices
}

export interface ScenarioQuestion extends BaseQuestion {
  type: "scenario";
  options: { id: string; text: string }[];
  correctAnswer: string;
  tradeOffs?: string;
}

export type Question =
  | MultipleChoiceQuestion
  | FillInBlankQuestion
  | SelectAllQuestion
  | OrderQuestion
  | ScenarioQuestion;

// ---------------------------------------------------------------------------
// Session types
// ---------------------------------------------------------------------------

export interface SessionMetadata {
  sessionId: string;
  title: string;
  summary: string;
  learningPoints: string[];
  questionCount: number;
  estimatedMinutes: number;
  reviewQuestionCount: number;
  questions: Question[];
}

export interface AnswerRecord {
  questionId: string;
  conceptId: string;
  isReview: boolean;
  correct: boolean;
  userAnswer: string; // JSON stringified
  correctAnswer: string; // JSON stringified
  sm2Grade: number;
}

export interface SessionResult {
  sessionId: string;
  xpEarned: number;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  conceptsUpdated: { conceptId: string; newStatus: string }[];
  streakUpdated: boolean;
  totalXp: number;
  mistakes: { questionId: string; stem: string; userAnswer: string; correctAnswer: string }[];
}

// ---------------------------------------------------------------------------
// Session state machine
// ---------------------------------------------------------------------------

export type SessionState = "intro" | "question" | "feedback" | "complete";

export interface SessionProgress {
  currentIndex: number;
  answers: AnswerRecord[];
  currentAnswer: string | string[] | null;
  isCorrect: boolean | null;
  showFeedback: boolean;
}
