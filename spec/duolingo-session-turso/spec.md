# Feature Specification: Duolingo-Style Session Engine with Turso DB

**Created**: 2026-07-09  
**Status**: Draft  
**Input**: Transform generic-tutor-web from a passive textbook reader into a Duolingo-style interactive learning platform with question types (multiple choice, fill-in-blank, select-all, ordering), session flow (intro → questions → results), immediate feedback, hearts/lives, progress bar, and session completion celebrations. Migrate from JSON file storage to Turso cloud DB so progress is shared across web app, Claude Code tutor sessions, and the podcast selector.

## Overview

The current generic-tutor-web is a read-and-self-rate flashcard app — users read a concept, then grade themselves 0-5. There are no interactive questions, no wrong/right answers, no session flow, and no gamification. This feature transforms it into a Duolingo-style guided lesson engine where users answer structured questions across a session, get immediate correct/incorrect feedback with explanations, earn XP and maintain streaks, and have their progress stored in Turso (cloud SQLite) so other processes (Claude Code, podcast selector) can read and write the same data.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete a Learning Session (Priority: P1)

A user opens the app, sees a "Start Session" card on the dashboard, taps it, and is taken through a guided lesson: a session intro screen explains what they'll learn, then they answer 8-10 interactive questions (mix of new content and review from past topics), each with immediate feedback (green check or red X + explanation), a progress bar tracking their position, and finally a session complete screen showing XP earned, accuracy %, and streak update.

**Why this priority**: This is the core value proposition — without interactive questions and session flow, nothing else matters. This is the minimum viable Duolingo experience.

**Independent Test**: Can be fully tested by starting a session, answering all questions, and verifying the complete flow from intro to results screen with correct feedback and XP tracking.

**Acceptance Scenarios**:

1. **Given** a user on the dashboard with due concepts, **When** they tap "Start Session", **Then** they see a session intro screen listing the topics and concepts covered, question count, and estimated time
2. **Given** a user on the session intro screen, **When** they tap "Start Lesson", **Then** the first question appears with a progress bar showing 1/N
3. **Given** a user answering a multiple choice question, **When** they select the correct answer and tap "Check", **Then** they see a green highlight on their selection, a "Correct!" message with an explanation, and a "Continue" button
4. **Given** a user answering a multiple choice question, **When** they select the wrong answer and tap "Check", **Then** they see a red highlight on their selection, a green highlight on the correct answer, a "Not quite" message with explanation, and lose 1 heart
5. **Given** a user has answered all questions in a session, **When** they reach the end, **Then** they see a session complete screen with total XP earned, accuracy percentage, streak status, and concepts covered

---

### User Story 2 - Fill-in-the-Blank Questions (Priority: P2)

A user encounters a fill-in-the-blank question during a session. The question displays a sentence with blank slots. The user either types their answer into the blanks or selects words from a word bank to fill them. On submission, each blank is checked individually — correct blanks show green, incorrect ones show red with the correct answer revealed.

**Why this priority**: Fill-in-blank is the most important question type for active recall (the core of Duolingo's effectiveness). It forces production, not just recognition.

**Independent Test**: Can be tested by starting a session containing fill-in-blank questions, typing or selecting answers, and verifying per-blank feedback.

**Acceptance Scenarios**:

1. **Given** a fill-in-blank question with 2 blanks, **When** the user types correct answers in both blanks and submits, **Then** both blanks highlight green and a "Correct!" message appears
2. **Given** a fill-in-blank question with a word bank, **When** the user taps words from the bank to fill blanks, **Then** the words appear in the blanks and can be removed by tapping again
3. **Given** a fill-in-blank question where the user fills one blank correctly and one incorrectly, **When** they submit, **Then** the correct blank shows green, the incorrect one shows red with the correct answer revealed

---

### User Story 3 - Session Hearts and Game Over (Priority: P2)

A user starts a session with 5 hearts. Each wrong answer costs 1 heart. If they lose all 5 hearts before completing the session, they see a "Game Over" screen showing their mistakes and offering a retry. This adds stakes and motivation, matching Duolingo's game-like feel.

**Why this priority**: Hearts create the game-like tension that keeps users engaged. Without consequences for wrong answers, the experience feels like a passive quiz with no motivation to be careful.

**Independent Test**: Can be tested by intentionally answering questions wrong until hearts reach 0, then verifying the game over screen appears with the option to retry.

**Acceptance Scenarios**:

1. **Given** a user with 5 hearts answers a question incorrectly, **Then** they lose 1 heart (display updates from 5 to 4) and see the correct answer explanation
2. **Given** a user with 1 remaining heart answers incorrectly, **Then** hearts reach 0 and a "Game Over" screen appears showing mistakes made and offering "Retry Session" or "Back to Home"
3. **Given** a user who ran out of hearts, **When** they tap "Retry Session", **Then** a new session starts with the same concepts but questions are re-shuffled and hearts reset to 5

---

### User Story 4 - Select-All-That-Apply and Ordering Questions (Priority: P3)

During a session, a user encounters two additional question types: (1) "Select all that apply" where they must check multiple correct options from a list, and (2) "Arrange in order" where they drag items into the correct sequence. Both provide the same immediate feedback pattern as multiple choice.

**Why this priority**: These question types add variety and test deeper understanding (select-all tests comprehensiveness, ordering tests procedural knowledge). They're important for a complete experience but not blocking for MVP.

**Independent Test**: Can be tested by encountering each question type in a session and verifying the interaction and feedback patterns.

**Acceptance Scenarios**:

1. **Given** a select-all question with 5 options (3 correct, 2 incorrect), **When** the user selects the 3 correct options and submits, **Then** all 3 highlight green and a "Correct!" message appears
2. **Given** a select-all question, **When** the user misses one correct option or selects an incorrect one, **Then** the missed correct option highlights yellow, incorrect selections highlight red, and an explanation appears
3. **Given** an ordering question with 4 items, **When** the user drags items into the correct sequence and submits, **Then** all items highlight green and a "Correct!" message appears
4. **Given** an ordering question, **When** the user places items in the wrong order, **Then** items in wrong positions highlight red and the correct sequence is shown

---

### User Story 5 - Review Questions Mixed into New Sessions (Priority: P3)

When a user starts a learning session on a new topic, the session engine automatically includes 2-3 review questions from previously studied concepts that are due for spaced repetition. These review questions appear with a "Review" badge and their answers update the SM-2 scheduling for those concepts.

**Why this priority**: This is what makes the system actually work for long-term retention. Without interleaved review, users forget previously learned concepts. Duolingo does this automatically.

**Independent Test**: Can be tested by completing a session on a new topic after having previously studied other concepts, and verifying that review questions from past topics appear in the session.

**Acceptance Scenarios**:

1. **Given** a user who has previously studied "Caching" (now due for review) starts a new session on "Load Balancing", **Then** 2-3 review questions about Caching appear mixed into the session with a "🔄 Review" badge
2. **Given** a user answers a review question correctly, **Then** the underlying concept's SM-2 interval increases and next review date pushes further out
3. **Given** a user answers a review question incorrectly, **Then** the concept's SM-2 interval resets and it appears for review again sooner

---

### User Story 6 - Turso DB Migration and Cross-Process Access (Priority: P1)

The system migrates from JSON file storage to Turso cloud database. The web app, Claude Code tutor sessions, and the podcast selector (selector.py) all read and write the same Turso database. A Claude Code session that quizzes a user on system design concepts writes review results to the same DB that the web app reads for dashboard stats and due concepts.

**Why this priority**: Without Turso, the web app's progress is isolated and lost on Vercel deploys. Cross-process access is the stated requirement — Claude Code and the podcast need to share progress data.

**Independent Test**: Can be tested by writing a review result via the web app API, then querying the Turso DB via the CLI to verify the data is there, and vice versa.

**Acceptance Scenarios**:

1. **Given** the web app is connected to Turso, **When** a user completes a session, **Then** all session data (questions answered, XP, accuracy, SM-2 updates) is written to Turso and persists across server restarts
2. **Given** the Turso DB has review data from the web app, **When** Claude Code queries the DB via the Turso CLI or HTTP API, **Then** it can read due concepts, streak status, and historical session data
3. **Given** Claude Code writes a review result to Turso, **When** the web app loads the dashboard, **Then** the new review data appears in stats and due concept calculations
4. **Given** the podcast selector is configured with the Turso DB URL, **When** it queries for due concepts, **Then** it receives the same data the web app sees (no more local file dependency)

---

### User Story 7 - Session Complete Celebration (Priority: P3)

When a user completes a session with at least 1 heart remaining, they see a celebratory session complete screen with confetti animation, their XP earned, accuracy percentage, streak status, and a preview of the next recommended session. This creates the dopamine hit that keeps users coming back.

**Why this priority**: This is the "juice" that makes the app feel like Duolingo rather than a dry quiz tool. Important for engagement but not blocking for core functionality.

**Independent Test**: Can be tested by completing a session and verifying the celebration screen renders with correct stats and confetti animation.

**Acceptance Scenarios**:

1. **Given** a user completes a session with all questions answered, **When** the session ends, **Then** a confetti animation plays and a results card shows XP earned, accuracy %, streak update, and concepts covered
2. **Given** a user completes a session with 100% accuracy, **Then** a special "Perfect!" badge appears alongside the confetti
3. **Given** a user completes a session that updated their streak to a new record, **Then** the streak display highlights the new record

---

### Edge Cases

- What happens when a user navigates away mid-session? Session progress is saved so they can resume or the incomplete session is discarded.
- What happens when the Turso DB is unreachable? The app shows a clear error message ("Unable to save progress — check your connection") and allows the user to continue the session read-only.
- What happens when there are no due concepts and no new concepts to learn? The dashboard shows an "All caught up!" state with encouragement to come back later.
- What happens when a fill-in-blank answer has minor casing differences? Answers are compared case-insensitively (e.g., "cp" matches "CP").
- What happens when all questions in the content bank have been answered? The session engine reuses questions with shuffled options for review sessions.
- What happens when the user has 0 concepts in the DB (fresh start)? The first session is a "getting started" lesson pulling from the easiest available concepts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present a session intro screen before each lesson, showing: topics covered, key learning points, question count, estimated duration, and any included review questions
- **FR-002**: System MUST support 4 question types: multiple choice, fill-in-the-blank (typed), fill-in-the-blank (word bank), select-all-that-apply, and arrange-in-order
- **FR-003**: System MUST provide immediate per-question feedback: correct answers show green highlight + explanation, incorrect answers show red highlight + correct answer revealed + explanation
- **FR-004**: System MUST display a progress bar during sessions showing question N of M
- **FR-005**: System MUST allocate 5 hearts per session, deducting 1 per wrong answer, and show a "Game Over" screen when hearts reach 0
- **FR-006**: System MUST show a session complete screen after all questions are answered, displaying: XP earned, accuracy percentage, hearts remaining, streak status, concepts covered, and mistakes to review
- **FR-007**: System MUST automatically include 2-3 review questions from previously-studied due concepts in each new learning session
- **FR-008**: System MUST update SM-2 spaced repetition scheduling per concept after each session based on question correctness (correct = SM-2 grade 4-5, incorrect = grade 1-2)
- **FR-009**: System MUST store all progress data (concepts, sessions, reviews, answers, streaks, XP) in Turso cloud database accessible via SQL over HTTP
- **FR-010**: System MUST support cross-process reads and writes to the same Turso database from the web app, Claude Code, and the podcast selector
- **FR-011**: System MUST migrate existing progress data from the JSON file store to Turso on first launch
- **FR-012**: System MUST parse structured question data from markdown content files (adding a `## Questions` section with type, stem, options, correct answer, and explanation)
- **FR-013**: System MUST build sessions dynamically: selecting 6-8 new questions from the target concept(s) plus 2-3 review questions from due concepts
- **FR-014**: System MUST compare fill-in-the-blank answers case-insensitively
- **FR-015**: System MUST allow session retry on game over (same concepts, reshuffled questions, hearts reset to 5)
- **FR-016**: System MUST show a "Review" badge on interleaved review questions to distinguish them from new content questions

### Key Entities

- **Topic**: A subject area (e.g., "System Design") containing multiple concepts. Has name, phase, goal, deadline.
- **Concept**: A single learnable unit (e.g., "Caching", "CAP Theorem"). Has title, difficulty, summary, key terms, and structured questions. Tracked by SM-2 (status: unseen/learning/reviewing/mastered, ease factor, interval, next review date).
- **Question**: An interactive assessment item belonging to a concept. Has type (multiple-choice/fill-in-blank/select-all/order), stem text, answer options, correct answer(s), and explanation.
- **Session**: A guided lesson containing 8-11 questions (mix of new + review). Has intro metadata, question sequence, and results (accuracy, XP, hearts used).
- **Answer**: A user's response to a single question within a session. Records whether correct, the user's answer, the correct answer, and the SM-2 grade applied.
- **Streak**: Daily study streak tracking (current, longest, last study date).
- **Stats**: Aggregate progress (total XP, concepts mastered).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a full learning session (intro → questions → results) in under 5 minutes for a standard 8-question session
- **SC-002**: Every question answered provides immediate visual feedback within 1 second of submission
- **SC-003**: Progress data persists across browser sessions and server restarts (verified by completing a session, closing the browser, reopening, and seeing the updated dashboard)
- **SC-004**: External processes (Claude Code, Turso CLI) can read and write the same progress data that the web app uses, verified by writing via one process and reading via another
- **SC-005**: All 4 question types render and function correctly with proper feedback (each type testable independently)
- **SC-006**: Session engine correctly interleaves review questions from due concepts into new learning sessions (verified by studying concept A, waiting for it to be due, then starting a session on concept B and seeing A review questions)

## Assumptions

- Single-user application — no multi-tenancy or auth required. All progress belongs to one learner.
- Turso database `generic-tutor` will be created in the same organization and region as the existing `kidlearn` database (aws-ap-south-1)
- The existing `kids-learning` project's Turso + Drizzle pattern (`@libsql/client` + `drizzle-orm`) will be replicated for consistency
- Content markdown files will be updated incrementally — questions will be added to the existing 25 concept files over time, starting with a subset for initial development
- `framer-motion` and `canvas-confetti` will be added for Duolingo-style animations
- The existing `generic-tutor` CLI project (`better-sqlite3` local DB) is a separate system that will continue to operate independently; sync between it and Turso is out of scope for this feature
- The podcast selector (`selector.py`) will be updated to use the Turso HTTP API instead of local SQLite, but this is a post-migration step
- Hearts reset to 5 at the start of each new session (not persistent across sessions like Duolingo's refilling hearts)
- SM-2 grading from session questions: correct on first try = grade 5, correct after seeing hint = grade 3, incorrect = grade 1

## Open Questions

- Should incomplete sessions (user navigated away mid-session) be resumable or discarded? (Default assumption: discarded — simpler, and Duolingo doesn't resume either)
- Should the question content be embedded in markdown files or stored in a separate structured format (e.g., JSON sidecar files)? (Default assumption: embedded in markdown `## Questions` section for single-source-of-truth per concept)
