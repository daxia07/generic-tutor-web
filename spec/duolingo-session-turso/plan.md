# Implementation Plan: Duolingo-Style Session Engine with Turso DB

**Input**: Feature specification from `spec/duolingo-session-turso/spec.md`

## Summary

Transform generic-tutor-web from a passive read-and-self-rate flashcard app into a Duolingo-style interactive learning platform. The core changes are: (1) migrate from JSON file storage to Turso cloud database for cross-process progress sharing, (2) build a session engine that presents guided lessons with intro screen → interactive questions → results screen, (3) implement 4 question types (multiple choice, fill-in-blank, select-all, ordering) with immediate feedback, and (4) add gamification (hearts/lives, progress bar, XP, streaks, confetti). Follow the existing `kids-learning` project's Turso + Drizzle pattern for DB access.

## Technical Context

**Language/Version**: TypeScript 5.9, Next.js 16.2 (App Router, React 19)
**Primary Dependencies**: @libsql/client, drizzle-orm, drizzle-kit, framer-motion, canvas-confetti (new); shadcn/ui, lucide-react, tailwindcss 4 (existing)
**Storage**: Turso cloud database (SQLite-compatible, SQL over HTTP), replacing local JSON file
**Testing**: Manual browser testing + Turso CLI verification for cross-process access
**Target Platform**: Web (Vercel deployment + local dev)
**Project Type**: Web application (Next.js App Router, server components + client components)
**Performance Goals**: Question feedback < 1 second render, session complete < 5 minutes
**Constraints**: Single-user (no auth), Turso free tier limits (9GB storage, 500M row reads/month)
**Scale/Scope**: 1 user, ~25 concepts (expandable), ~100 questions initially, personal use

## Project Structure

### Documentation (this feature)

```text
spec/duolingo-session-turso/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task breakdown (Phase 3)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── db/
│   │   ├── index.ts           # Turso client + Drizzle wrapper (NEW)
│   │   └── schema.ts          # Drizzle table definitions (NEW)
│   ├── sm2.ts                 # SM-2 algorithm (KEEP, minor updates)
│   ├── content.ts             # Markdown parser (UPDATE: add question parsing)
│   ├── session.ts             # Session builder engine (NEW)
│   ├── types.ts               # Shared types (UPDATE: add Question, Session types)
│   ├── store.ts               # DELETE (replaced by Turso DB)
│   └── utils.ts               # KEEP
├── components/
│   ├── ui/                    # KEEP (shadcn components)
│   ├── questions/
│   │   ├── MultipleChoice.tsx  # MC question renderer (NEW)
│   │   ├── FillInBlank.tsx     # Fill-in-blank renderer (NEW)
│   │   ├── SelectAll.tsx       # Select-all renderer (NEW)
│   │   └── OrderArrange.tsx    # Ordering renderer (NEW)
│   ├── session/
│   │   ├── SessionIntro.tsx    # Session intro screen (NEW)
│   │   ├── SessionComplete.tsx # Session results + confetti (NEW)
│   │   ├── SessionGameOver.tsx # Hearts depleted screen (NEW)
│   │   ├── ProgressBar.tsx     # Animated progress bar (NEW)
│   │   └── HeartsDisplay.tsx   # Heart icons with loss animation (NEW)
│   └── dashboard/
│       └── ContinueLearning.tsx # Next session card for dashboard (NEW)
├── app/
│   ├── page.tsx               # Dashboard (UPDATE: add session card)
│   ├── layout.tsx             # KEEP
│   ├── learn/
│   │   └── page.tsx           # Learn listing (UPDATE: use Turso queries)
│   ├── session/
│   │   └── [sessionId]/
│   │       └── page.tsx       # Session flow page (NEW - main lesson page)
│   ├── review/
│   │   └── page.tsx           # Review page (UPDATE: redirect to session)
│   └── api/
│       ├── session/
│       │   └── route.ts       # Session builder + result API (NEW)
│       ├── grade/
│       │   └── route.ts       # DELETE (replaced by session API)
│       ├── concept/
│       │   └── [conceptId]/
│       │       └── route.ts   # UPDATE: use Turso queries
│       └── progress/
│           └── route.ts       # UPDATE: use Turso queries
content/
└── system-design/
    └── *.md                    # UPDATE: add ## Questions sections (25 files)
drizzle.config.ts               # NEW: Drizzle Kit config
.env.local                      # UPDATE: add TURSO_DB_URL, TURSO_DB_TOKEN
```

**Structure Decision**: Follows the existing Next.js App Router convention. New `src/lib/db/` directory mirrors the `kids-learning` pattern. New `src/components/questions/` and `src/components/session/` directories organize the Duolingo-style UI components. The `src/app/session/` route is the primary new page.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Drizzle ORM | Type-safe queries, schema-as-code, `drizzle-kit push` for migrations | Raw `@libsql/client` SQL would work but loses type safety and makes schema management ad-hoc |
| framer-motion | Duolingo's magic is in animations (answer jiggles, progress fill, confetti) | CSS-only animations are insufficient for the spring-physics feedback Duolingo uses |
| 4 question type components | Each type has fundamentally different interaction patterns (select, type, drag) | A single generic "question" component would be an unmaintainable switch statement |

## Research & Decisions

### Decision 1: Turso Client Package

**Decision**: Use `@libsql/client` with `drizzle-orm` (matching `kids-learning` pattern)

**Rationale**: The `kids-learning` project already uses this exact stack successfully in production. `@libsql/client` provides the `/web` import for Vercel serverless compatibility. Drizzle provides type-safe queries and `drizzle-kit push` for schema management without migration files. The `@tursodatabase/serverless` package is lighter but doesn't support Drizzle ORM.

**Alternatives considered**:
- `@tursodatabase/serverless` — zero deps, but no Drizzle support, no ORM ecosystem
- `better-sqlite3` + Turso sync — would require native binary, doesn't work on Vercel
- Raw SQL via `@libsql/client` without Drizzle — loses type safety, more boilerplate

### Decision 2: Session Flow Architecture

**Decision**: Client-side session state machine with server-side persistence

**Rationale**: The session flow (intro → question1 → question2 → ... → results) is inherently stateful and interactive — it must run on the client. But the data (questions, progress, SM-2 state) lives on the server. The approach: the API builds a session (selects questions, returns them), the client runs through the session locally (tracking hearts, answers, progress), and on session completion, the client POSTs all results back to the API which writes to Turso in one transaction.

**Alternatives considered**:
- Server-side session with real-time round trips per question — too slow, defeats Duolingo feel
- Full client-side with batch write at end — same as chosen approach, this IS the chosen approach
- LocalStorage + sync — adds complexity, no benefit over direct Turso writes

### Decision 3: Question Content Storage

**Decision**: Embedded in markdown `## Questions` sections (per spec assumption)

**Rationale**: Single source of truth per concept file. The parser already extracts sections by headings. Adding a `## Questions` section with YAML-structured question data keeps content co-located with the concept it tests. The parser converts these to structured `Question` objects at build time.

**Alternatives considered**:
- Separate JSON sidecar files (e.g., `caching.questions.json`) — splits content across files, harder to maintain
- Turso DB stored questions — requires admin UI or migration scripts to update, no git diff visibility
- YAML frontmatter in markdown — frontmatter is for metadata, not multi-record structured data

### Decision 4: Content Parsing Strategy for Questions

**Decision**: Custom parser within `content.ts` that reads `## Questions` sections and parses YAML-flavored question blocks

**Rationale**: The existing `parseSections()` function already splits markdown by `##` headings. Extending it to recognize `### Q1`, `### Q2` sub-headings with key-value pairs (type, stem, options, correct, explanation) keeps the pattern consistent. No new dependencies needed — `gray-matter` is already installed for frontmatter, and simple key-value parsing doesn't require a full YAML library.

**Alternatives considered**:
- Full YAML parser (js-yaml) — adds a dependency for a format only used in questions
- JSON blocks in markdown — ugly to read/edit in markdown files
- TOML — another dependency, less familiar than YAML

### Decision 5: Hearts Model

**Decision**: 5 hearts per session, non-persistent, lost hearts do NOT carry between sessions

**Rationale**: Duolingo's persistent hearts (refill over time or pay gems) is a monetization mechanic that doesn't apply to a personal learning tool. Per-session hearts provide the game tension without the frustrating "can't study until hearts refill" mechanic. Simple to implement — just client-side state.

**Alternatives considered**:
- Persistent hearts (like Duolingo) — adds complexity, monetization mechanic irrelevant for self-study
- No hearts at all — loses game-like tension that keeps users careful
- 3 hearts instead of 5 — too punishing for harder system design questions

### Decision 6: SM-2 Grading from Questions

**Decision**: Map question correctness to SM-2 grades: correct on first try = grade 5, incorrect = grade 1. Select-all partially correct = grade 3. Ordering off by 1 position = grade 3.

**Rationale**: The current self-rating 0-5 system is replaced by objective question results. The mapping preserves the SM-2 algorithm's behavior while removing the subjective self-assessment. Partial correctness gets a middle grade to avoid completely resetting the interval for small mistakes.

**Alternatives considered**:
- Binary correct/incorrect (grade 5 or 0) — too aggressive, small mistakes shouldn't reset the interval
- Per-question-time-based grading (faster = higher grade) — adds unnecessary complexity
- Keep self-rating alongside questions — defeats the purpose of Duolingo-style objective assessment

## Data Model

### Turso Database Schema (Drizzle table definitions)

**Table: `topics`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PRIMARY KEY | Slug identifier (e.g., "system-design") |
| name | text | NOT NULL | Display name |
| phase | integer | NOT NULL, DEFAULT 1 | Learning phase |
| goal | text | nullable | Learning goal description |
| deadline | text | nullable | Target completion date |
| createdAt | text | NOT NULL | ISO timestamp |
| lastSession | text | nullable | Date of last session |

**Table: `concepts`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PRIMARY KEY | Slug from filename (e.g., "caching") |
| topicId | text | NOT NULL, REFERENCES topics(id) ON DELETE CASCADE | Parent topic |
| title | text | NOT NULL | Display title |
| difficulty | integer | NOT NULL, DEFAULT 3 | 1-5 difficulty |
| summary | text | NOT NULL, DEFAULT '' | Definition/summary text |
| keyTerms | text | NOT NULL, DEFAULT '{}' | JSON object: term → definition |
| whyItMatters | text | NOT NULL, DEFAULT '' | Importance explanation |
| prerequisites | text | NOT NULL, DEFAULT '[]' | JSON array of concept IDs |
| tags | text | NOT NULL, DEFAULT '[]' | JSON array of tag strings |
| status | text | NOT NULL, DEFAULT 'unseen' | unseen/learning/reviewing/mastered |
| ef | real | NOT NULL, DEFAULT 2.5 | SM-2 ease factor |
| interval | integer | NOT NULL, DEFAULT 0 | SM-2 interval in days |
| repetitions | integer | NOT NULL, DEFAULT 0 | SM-2 repetition count |
| nextReview | text | nullable | ISO date when next due |
| lastGrade | integer | nullable | Last SM-2 grade received |
| filePath | text | nullable | Source markdown file path |

**Table: `questions`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PRIMARY KEY | Composite: conceptId + index (e.g., "caching-q1") |
| conceptId | text | NOT NULL, REFERENCES concepts(id) ON DELETE CASCADE | Parent concept |
| type | text | NOT NULL | multiple-choice / fill-in-blank / select-all / order |
| stem | text | NOT NULL | Question text (may contain ____ for blanks) |
| options | text | NOT NULL, DEFAULT '[]' | JSON: array of {id, text} for MC/select-all, or string[] for ordering |
| correctAnswer | text | NOT NULL | JSON: string for MC, string[] for fill-blank, string[] for select-all, string[] for order |
| explanation | text | NOT NULL, DEFAULT '' | Why the answer is correct |
| hint | text | nullable | Optional hint for fill-in-blank |
| wordBank | text | nullable | JSON: string[] for word-bank fill-in-blank variant |
| difficulty | integer | NOT NULL, DEFAULT 3 | Question difficulty 1-5 |

**Table: `sessions`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PRIMARY KEY | UUID |
| topicId | text | NOT NULL, REFERENCES topics(id) | Parent topic |
| mode | text | NOT NULL | learn / review |
| source | text | NOT NULL, DEFAULT 'web' | web / claude-code / podcast |
| startedAt | text | nullable | ISO timestamp |
| completedAt | text | nullable | ISO timestamp |
| totalQuestions | integer | NOT NULL, DEFAULT 0 | Number of questions in session |
| correctCount | integer | NOT NULL, DEFAULT 0 | Questions answered correctly |
| accuracy | real | NOT NULL, DEFAULT 0 | Percentage correct |
| xpEarned | integer | NOT NULL, DEFAULT 0 | XP from this session |
| heartsRemaining | integer | NOT NULL, DEFAULT 5 | Hearts left at session end |
| completed | integer | NOT NULL, DEFAULT 0 | 1 = completed, 0 = abandoned |
| conceptsReviewed | text | NOT NULL, DEFAULT '[]' | JSON: array of concept IDs |

**Table: `answers`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | integer | PRIMARY KEY AUTOINCREMENT | Auto-increment |
| sessionId | text | NOT NULL, REFERENCES sessions(id) ON DELETE CASCADE | Parent session |
| questionId | text | NOT NULL, REFERENCES questions(id) | Question answered |
| conceptId | text | NOT NULL, REFERENCES concepts(id) | Concept being tested |
| isReview | integer | NOT NULL, DEFAULT 0 | 1 = review question, 0 = new |
| correct | integer | NOT NULL | 1 = correct, 0 = incorrect |
| userAnswer | text | NOT NULL | JSON: user's answer value |
| correctAnswer | text | NOT NULL | JSON: correct answer value |
| sm2Grade | integer | NOT NULL | SM-2 grade applied (1-5) |
| createdAt | text | NOT NULL | ISO timestamp |

**Table: `streaks`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | integer | PRIMARY KEY, CHECK(id=1) | Single row |
| current | integer | NOT NULL, DEFAULT 0 | Current streak in days |
| longest | integer | NOT NULL, DEFAULT 0 | Best streak ever |
| lastStudyDate | text | NOT NULL, DEFAULT '' | ISO date of last study |
| streakHistory | text | NOT NULL, DEFAULT '[]' | JSON: last 14 ISO dates |

**Table: `stats`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | integer | PRIMARY KEY, CHECK(id=1) | Single row |
| totalXp | integer | NOT NULL, DEFAULT 0 | Cumulative XP earned |
| conceptsMastered | integer | NOT NULL, DEFAULT 0 | Concepts with ef≥2.5 and interval≥21 |

### Entity Relationships

```
topics ──1:N──> concepts ──1:N──> questions
                  │                    │
                  │                    └──> answers <── sessions
                  │                              │
                  └──> answers (via conceptId)    └──> sessions
                                                       │
                                                   streaks (singleton)
                                                   stats (singleton)
```

### State Transitions for Concepts

```
unseen ──(first session)──> learning ──(reps≥3, ef<2.5)──> reviewing ──(ef≥2.5, interval≥21)──> mastered
  │                            │                              │                              │
  └──(skip to learning)        └──(grade<3, reset reps)──>    └──(grade<3, reset)──>         └──(grade<3, back to reviewing)
                               learning                       learning
```

## Contracts & Interfaces

### API Endpoints

**GET /api/session**
- Purpose: Build and return a new learning session
- Query params: `topicId` (optional, defaults to system-design), `mode` (learn|review, defaults to learn)
- Response: `{ sessionId, title, summary, learningPoints, questionCount, estimatedMinutes, reviewQuestionCount, questions: Question[] }`
- Notes: Selects 6-8 new questions from unseen/learning concepts + 2-3 review questions from due concepts. Questions are shuffled. Session record is created in DB with `completed=0`.

**POST /api/session/result**
- Purpose: Submit session results and update SM-2 / XP / streaks
- Body: `{ sessionId, answers: Array<{questionId, conceptId, correct, userAnswer, isReview}>, heartsRemaining }`
- Response: `{ xpEarned, accuracy, conceptsUpdated: Array<{conceptId, newStatus}>, streakUpdated, totalXp }`
- Notes: Runs in a single Drizzle transaction. For each answer, computes SM-2 grade, updates the concept's SM-2 state, inserts the answer record, and updates session stats. Updates streak and XP in `stats`/`streaks` tables.

**GET /api/progress**
- Purpose: Dashboard data (stats, due count, streak, recent sessions)
- Response: `{ streak, totalXp, conceptsMastered, totalConcepts, dueCount, unseenCount, learningCount, reviewingCount, masteredCount, recentSessions }`
- Notes: Replaces current JSON-store-based progress endpoint.

**GET /api/concept/[conceptId]**
- Purpose: Get concept detail + questions + SM-2 state
- Response: `{ concept, questions, card }` (card = SM-2 state from concepts table)
- Notes: Updated to read from Turso instead of JSON store.

### External Access Contract (Claude Code / Podcast Selector)

**Read access**: Any process with `TURSO_DB_URL` + `TURSO_DB_TOKEN` can:
- Query due concepts: `SELECT * FROM concepts WHERE status != 'mastered' AND (nextReview <= date('now') OR nextReview IS NULL)`
- Read streak: `SELECT * FROM streaks WHERE id = 1`
- Read stats: `SELECT * FROM stats WHERE id = 1`
- List sessions: `SELECT * FROM sessions ORDER BY startedAt DESC LIMIT 10`

**Write access**: External processes can:
- Insert a session + answers via the `/api/session/result` HTTP endpoint (preferred)
- Or directly INSERT into `sessions` and `answers` tables via Turso HTTP API, then UPDATE `concepts` SM-2 fields and `stats`/`streaks`

**Key SQL queries for external tools**:
- Due concepts (what to study next): `SELECT id, title, status, ef, interval, nextReview FROM concepts WHERE status IN ('learning','reviewing') AND (nextReview <= date('now') OR nextReview IS NULL) ORDER BY ef ASC`
- Concept detail: `SELECT * FROM concepts WHERE id = ?`
- Record review from Claude Code: INSERT into `sessions` (source='claude-code') + `answers`, then UPDATE `concepts` SET ef/interval/repetitions/nextReview/status

### Client-Side Session State Machine

```
States: intro | question | feedback | game-over | complete

intro ──(tap "Start Lesson")──> question
question ──(submit answer)──> feedback
feedback ──(tap "Continue", hearts>0, more questions)──> question
feedback ──(tap "Continue", hearts=0)──> game-over
feedback ──(tap "Continue", hearts>0, last question)──> complete
game-over ──(tap "Retry")──> intro (same session, reshuffled)
game-over ──(tap "Back to Home")──> [navigate to /]
complete ──(tap "Continue Learning")──> [navigate to /]
```

### Question Type Contracts

**MultipleChoice**: `{ type: "multiple-choice", stem: string, options: Array<{id, text}>, correctAnswer: string, explanation: string }`
- User selects one option. Feedback: selected=green if correct, selected=red + correct=green if incorrect.

**FillInBlank**: `{ type: "fill-in-blank", stem: string (contains ____), correctAnswer: string[], hint?: string, wordBank?: string[], explanation: string }`
- User types into blank slots or selects from word bank. Each blank checked independently. Case-insensitive comparison.

**SelectAll**: `{ type: "select-all", stem: string, options: Array<{id, text}>, correctAnswer: string[], explanation: string }`
- User toggles multiple options. Feedback: correct selections=green, incorrect selections=red, missed correct=yellow.

**Order**: `{ type: "order", stem: string, options: string[], correctAnswer: string[], explanation: string }`
- User reorders items. Feedback: items in correct position=green, wrong position=red. Correct sequence shown.
