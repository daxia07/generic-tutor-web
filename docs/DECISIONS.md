# Architecture Decisions

## ADR-001: External data root (not in git)

**Date:** 2026-07-16  
**Status:** Accepted  

**Decision:** All learner content and generated artifacts live outside this repo:

```
~/workspace/generic-tutor-web/
  content/system-design/   # concept markdown + questions
  digests/                 # notes + feedback captures (JSON mirror)
  context-packs/           # digestor context packs
  plans/                   # overnight daily path plans
  logs/                    # overnight run logs
```

Override with env `TUTOR_DATA_DIR`. The in-repo `content/` path is deprecated and gitignored.

**Why:** Content churn (overnight LLM rewrites, digests) must not pollute git history or require commits to study.

---

## ADR-002: Options-only assessment

**Date:** 2026-07-16  
**Status:** Accepted  

**Decision:** Product UI presents only option-based questions:

- `multiple-choice`
- `scenario` (same UI as MC; longer stem, trade-off explanations)

Dropped from the product path: fill-in-blank, select-all, order/drag.

**Why:** User wants to train judgment by choosing among options, not typing or dragging. Keeps the client thin and fast.

Legacy non-option rows may still exist in DB/markdown; session builder filters to option types (or maps scenario → MC UI).

---

## ADR-003: Pip coach character

**Date:** 2026-07-16  
**Status:** Accepted  

**Decision:** Mascot **Pip** (owl 🦉) appears on the learning path and in lesson speech bubbles. V1 is emoji/CSS; SVG/Lottie later.

---

## ADR-004: Digest inbox → overnight pipeline

**Date:** 2026-07-16  
**Status:** Accepted  

**Decision:** Digest page is a **capture inbox**, not a synchronous lesson generator.

- User saves **notes** + optional **feedback** + **signals**
- Status: `inbox` | `queued` | `processing` | `done` | `failed`
- Overnight job (cron + DeepSeek) consumes `queued` items, builds context packs + MC questions, updates path plan

Daytime “Save + queue for tonight” is the default happy path. No long LLM wait on the web request.

---

## ADR-005: Overnight brain (cron + DeepSeek)

**Date:** 2026-07-16  
**Status:** Accepted  

**Decision:**

- Schedule: **03:00** local (macOS crontab)
- Model: DeepSeek (`DEEPSEEK_API_KEY`, `https://api.deepseek.com`)
- Script: `scripts/overnight-pipeline.ts` via `npm run overnight`
- Inputs: progress analytics + queued digests + existing content under `TUTOR_DATA_DIR`
- Outputs: rewritten/added MC content, context packs, `plans/YYYY-MM-DD.json`, digest status updates, log under `logs/`

**Note (2026-07-16):** No overnight job for this web app was present on crontab before install; sibling `generic-tutor` sync runs at 09:15.

---

## ADR-006: Duolingo shell UX

**Date:** 2026-07-16  
**Status:** Accepted  

**Decision:**

| Surface | Behavior |
|---------|----------|
| Home | Vertical unit **path** (done / current / locked), not a card dashboard |
| Lesson | Full-screen: progress · hearts · Pip bubble · options · CHECK/CONTINUE |
| Digest | Notes + feedback inbox |
| Plan | Overnight status + tomorrow’s path preview |
| Me | Streak / XP / settings |
| Nav | Bottom tabs: Home · Digest · Plan · Me |

Design mock: `design-mocks/duolingo-redesign.html`

---

## ADR-007: Performance baseline

**Date:** 2026-07-16  
**Status:** Accepted  

- Prefer option-only UI (smaller client)
- Avoid re-parsing entire content tree on every dashboard hit when DB is source of truth
- Overnight / digestor LLM work is async (cron), never blocks lesson start
- Reduce motion on hot path (no framer per option)
