// ---------------------------------------------------------------------------
// JSON file-based progress store
// Single-user, local-first. Survives server restarts.
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import type { ProgressStore, ReviewCard, SessionRecord, StreakState } from "./types";
import { createCard, gradeResponse } from "./sm2";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "progress.json");

// ---------------------------------------------------------------------------
// Store lifecycle
// ---------------------------------------------------------------------------

export function getStore(): ProgressStore {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) {
    return createEmptyStore();
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const store = JSON.parse(raw) as ProgressStore;
    return migrateStore(store);
  } catch {
    return createEmptyStore();
  }
}

export function saveStore(store: ProgressStore): void {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function createEmptyStore(): ProgressStore {
  return {
    version: 1,
    cards: {},
    sessions: [],
    streak: {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      streakHistory: [],
    },
    totalXp: 0,
    conceptsMastered: 0,
  };
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function migrateStore(store: ProgressStore): ProgressStore {
  // Add future migrations here
  if (!store.streak) {
    store.streak = {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      streakHistory: [],
    };
  }
  if (store.totalXp === undefined) store.totalXp = 0;
  if (store.conceptsMastered === undefined) store.conceptsMastered = 0;
  return store;
}

// ---------------------------------------------------------------------------
// Card operations
// ---------------------------------------------------------------------------

/** Get a card, creating it if this is a new concept. */
export function getOrCreateCard(
  store: ProgressStore,
  conceptId: string,
  title: string,
  difficulty: number
): ReviewCard {
  if (!store.cards[conceptId]) {
    store.cards[conceptId] = createCard(conceptId, title, difficulty);
  }
  return store.cards[conceptId];
}

/** Grade a concept and record the session. */
export function gradeConcept(
  store: ProgressStore,
  conceptId: string,
  grade: number
): { card: ReviewCard; xpEarned: number; streakUpdated: boolean } {
  const card = store.cards[conceptId];
  if (!card) throw new Error(`No card for concept: ${conceptId}`);

  const updated = gradeResponse(card, grade);

  // Check if newly mastered
  const wasMastered = card.ef >= 2.5 && card.interval >= 21;
  const isNowMastered = updated.ef >= 2.5 && updated.interval >= 21;
  if (!wasMastered && isNowMastered) {
    store.conceptsMastered++;
  }

  store.cards[conceptId] = updated;

  // XP: 0-5 scaled. Passing grades (3+) earn more.
  const xpEarned = grade >= 3 ? grade * 10 : grade * 3;
  store.totalXp += xpEarned;

  // Streak
  const streakUpdated = updateStreak(store);

  // Session record
  const today = new Date().toISOString().split("T")[0];
  const lastSession = store.sessions[store.sessions.length - 1];
  if (lastSession && lastSession.date === today) {
    lastSession.conceptsReviewed++;
    lastSession.xpEarned += xpEarned;
  } else {
    store.sessions.push({
      date: today,
      conceptsReviewed: 1,
      xpEarned,
      mode: card.reps === 0 ? "learn" : "review",
    });
  }

  return { card: updated, xpEarned, streakUpdated };
}

// ---------------------------------------------------------------------------
// Streak tracking
// ---------------------------------------------------------------------------

function updateStreak(store: ProgressStore): boolean {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000)
    .toISOString()
    .split("T")[0];

  const { streak } = store;

  // Already studied today — no change
  if (streak.lastStudyDate === today) return false;

  if (streak.lastStudyDate === yesterday) {
    // Consecutive day
    streak.currentStreak++;
  } else if (streak.lastStudyDate !== today) {
    // Streak broken or first day
    streak.currentStreak = 1;
  }

  streak.lastStudyDate = today;

  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }

  // Maintain 14-day history
  if (!streak.streakHistory.includes(today)) {
    streak.streakHistory.push(today);
    if (streak.streakHistory.length > 14) {
      streak.streakHistory = streak.streakHistory.slice(-14);
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Get cards due for review, sorted by urgency. */
export function getDueCards(store: ProgressStore, limit?: number): ReviewCard[] {
  const now = Date.now();
  return Object.values(store.cards)
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due)
    .slice(0, limit);
}

/** Get unseen concepts (not yet in the store). */
export function getUnseenIds(
  store: ProgressStore,
  allConceptIds: string[]
): string[] {
  return allConceptIds.filter((id) => !store.cards[id]);
}

/** How many concepts are at each stage? */
export function getProgressStats(store: ProgressStore): {
  unseen: number;
  learning: number; // reps < 3
  reviewing: number; // reps >= 3, not mastered
  mastered: number; // ef >= 2.5 and interval >= 21
} {
  let learning = 0;
  let reviewing = 0;
  let mastered = 0;

  for (const card of Object.values(store.cards)) {
    if (card.ef >= 2.5 && card.interval >= 21) {
      mastered++;
    } else if (card.reps >= 3) {
      reviewing++;
    } else {
      learning++;
    }
  }

  return { unseen: 0, learning, reviewing, mastered };
}
