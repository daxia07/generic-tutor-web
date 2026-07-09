// ---------------------------------------------------------------------------
// SM-2 Spaced Repetition Algorithm
// Ported from generic-tutor/src/sm2.ts
//
// Pure functions — no side effects, no DB calls.
// ---------------------------------------------------------------------------

import type { ReviewCard } from "./types";

/**
 * Grade a review and return the updated card.
 *
 * Grades:
 *   0 — complete blackout
 *   1 — incorrect, but answer felt familiar
 *   2 — incorrect, but answer felt easy to recall
 *   3 — correct, but required serious effort
 *   4 — correct, after some hesitation
 *   5 — perfect response with no hesitation
 */
export function gradeResponse(card: ReviewCard, grade: number): ReviewCard {
  const now = new Date().toISOString();
  const clampedGrade = Math.max(0, Math.min(5, grade));

  if (clampedGrade < 3) {
    // Failed — reset
    return {
      ...card,
      reps: 0,
      interval: 1,
      ef: Math.max(1.3, card.ef - 0.2),
      nextReview: addDays(new Date(), 1).toISOString(),
      lastReview: now,
      due: Date.now() + 86_400_000, // 1 day
    };
  }

  // Passed — advance
  const newEf = easeFactor(card.ef, clampedGrade);
  const newInterval = nextInterval(card.reps + 1, card.interval, newEf);
  const nextDate = addDays(new Date(), newInterval);

  return {
    ...card,
    reps: card.reps + 1,
    interval: newInterval,
    ef: newEf,
    nextReview: nextDate.toISOString(),
    lastReview: now,
    due: nextDate.getTime(),
  };
}

/**
 * Create a new SM-2 card for a never-seen concept.
 */
export function createCard(conceptId: string, title: string, difficulty: number): ReviewCard {
  const now = Date.now();
  return {
    conceptId,
    title,
    difficulty,
    reps: 0,
    ef: 2.5,
    interval: 0,
    nextReview: new Date(now).toISOString(),
    lastReview: null,
    due: now, // due immediately
  };
}

/**
 * Calculate new ease factor (SM-2 formula).
 */
function easeFactor(oldEf: number, grade: number): number {
  const updated =
    oldEf + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  return Math.max(1.3, Math.round(updated * 100) / 100);
}

/**
 * Calculate next interval in days.
 */
function nextInterval(reps: number, prevInterval: number, ef: number): number {
  if (reps === 1) return 1;
  if (reps === 2) return 6;
  return Math.round(prevInterval * ef);
}

/** Add N days to a date */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Get the concepts due for review today.
 */
export function getDueCards(cards: ReviewCard[], limit?: number): ReviewCard[] {
  const now = Date.now();
  const due = cards
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due); // oldest due first
  return limit ? due.slice(0, limit) : due;
}

/**
 * Get concepts that are ready to learn next (unseen, lowest difficulty first).
 */
export function getNextToLearn(
  allConceptIds: string[],
  existingCards: Record<string, ReviewCard>,
  limit: number = 3
): string[] {
  return allConceptIds
    .filter((id) => !existingCards[id])
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Duolingo-style grading — map question correctness to SM-2 grades
// ---------------------------------------------------------------------------

/**
 * Map question correctness to an SM-2 grade.
 * - Correct on first try → grade 5
 * - Partially correct → grade 3
 * - Incorrect → grade 1
 */
export function gradeFromCorrectness(isCorrect: boolean, isPartial: boolean = false): number {
  if (isCorrect) return 5;
  if (isPartial) return 3;
  return 1;
}

/**
 * Compute the next SM-2 state from current values and a grade.
 * Returns the updated fields (does not require a ReviewCard).
 */
export function computeNextSm2(
  currentEf: number,
  currentInterval: number,
  currentReps: number,
  grade: number
): { ef: number; interval: number; repetitions: number; nextReview: string; status: string } {
  const clampedGrade = Math.max(0, Math.min(5, grade));
  const now = new Date();

  if (clampedGrade < 3) {
    // Failed — reset
    const newEf = Math.max(1.3, Math.round((currentEf - 0.2) * 100) / 100);
    return {
      ef: newEf,
      interval: 1,
      repetitions: 0,
      nextReview: addDays(now, 1).toISOString(),
      status: "learning",
    };
  }

  // Passed — advance
  const newEf = easeFactor(currentEf, clampedGrade);
  const newReps = currentReps + 1;
  const newInterval = nextInterval(newReps, currentInterval, newEf);
  const nextDate = addDays(now, newInterval);
  const isMastered = newEf >= 2.5 && newInterval >= 21;

  return {
    ef: newEf,
    interval: newInterval,
    repetitions: newReps,
    nextReview: nextDate.toISOString(),
    status: isMastered ? "mastered" : newReps >= 3 ? "reviewing" : "learning",
  };
}
