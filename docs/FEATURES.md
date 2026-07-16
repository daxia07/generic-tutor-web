# Features

Living product surface for **generic-tutor-web** (Duolingo-style system design trainer).

## Core learning

### Learning path (Home)
- Unit path with nodes: completed ★, current (pulse), locked
- Stats strip: streak · gems (placeholder) · hearts · XP
- Tap current node → start session for that concept / quick session
- Pip tip bubble

### Lesson (session)
- Intro optional; main loop is questions
- **Options only** (MC + scenario)
- Progress bar, hearts, Pip speech bubble with stem
- CHECK → feedback footer (correct/incorrect + explanation) → CONTINUE
- Session complete: XP, accuracy, streak, hearts; continue path / review mistakes

### Spaced repetition
- SM-2 updates per concept after session
- Review questions mixed into learn sessions when due

## Content Digestor

Capture inbox (not a synchronous generator).

| Action | Effect |
|--------|--------|
| Save to inbox | Persist **notes** + **feedback** + signals; no overnight |
| Save + queue for tonight | `status=queued` → overnight pipeline |
| Queue (from list) | Move inbox/failed → queued |
| Overnight | DeepSeek uses notes **and** feedback as prompt bias → context pack + option MC → path node; marks done/failed |

Stored fields: notes, feedback, sourceType, signals[], status, result, timestamps.  
Mirrored under `~/workspace/generic-tutor-web/digests/`.

## Overnight plan

Runs ~3:00 AM (or `npm run overnight`):

1. Load progress analytics  
2. Process queued digests (notes + feedback as prompt bias)  
3. Rewrite high-miss option questions  
4. Add MC for zero-engagement concepts  
5. Write tomorrow’s path plan to `plans/YYYY-MM-DD.json` + DB  
6. Log to `logs/`

Plan page shows queue depth, last run, tomorrow’s path, toggle for auto-run (cron is source of truth).

## Content storage

- **Not in git** — `TUTOR_DATA_DIR` (default `~/workspace/generic-tutor-web`)
- Turso holds progress, digests metadata, sessions, questions cache from seed

## Auth
- Existing `@mingli/auth` login cookie flow unchanged

## Out of scope (for this redesign)
- Multiplayer, social leagues  
- Typed free-response  
- Real-time LLM chat tutor during lesson  
