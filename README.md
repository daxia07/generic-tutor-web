# Tutor Web — Duolingo-Style System Design Learning

A gamified web app for learning system design interview concepts using SM-2 spaced repetition. Content sourced from [generic-tutor](https://github.com/ding/generic-tutor) markdown files.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui
- **SM-2 algorithm** — same as generic-tutor, ported to pure TypeScript
- **JSON file store** — single-user progress, no database needed
- **gray-matter** — markdown frontmatter parsing

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with nav
│   ├── page.tsx                # Dashboard (streaks, XP, due concepts)
│   ├── learn/
│   │   ├── page.tsx            # All concepts list
│   │   └── [conceptId]/page.tsx  # Learning session (content + grading)
│   ├── review/page.tsx         # Due concepts for review
│   └── api/
│       ├── progress/route.ts   # GET progress summary
│       ├── grade/route.ts      # POST grade a concept
│       └── concept/[conceptId]/route.ts  # GET concept + card
├── lib/
│   ├── sm2.ts                  # SM-2 algorithm (pure functions)
│   ├── content.ts              # Markdown loader + parser
│   ├── store.ts                # JSON progress store
│   └── types.ts                # Shared TypeScript types
└── components/ui/              # shadcn/ui components
content/system-design/          # 25 concept markdown files
data/progress.json              # Learner progress (gitignored)
```

## How It Works

1. **Dashboard** shows streaks, XP, mastered concepts, and due reviews
2. **Learn** page lists all concepts sorted by progress
3. Click a concept → read definition, key terms, interview questions, gotchas
4. **Self-grade** (0-5) → SM-2 algorithm schedules next review
5. **Review** page shows concepts due today with streak calendar

## Adding Content

Drop markdown files in `content/system-design/`. Each file needs:

```markdown
# Concept Title

## Definition
The definition text...

## Key Terms
- **Term**: Definition

## Why It Matters
Why this matters for interviews...

## Interview Questions
1. Question one?
2. Question two?

## Gotchas
- Common mistake one
- Common mistake two
```

## Deployment

```bash
npm run build
npm start
```

Deploy to Vercel with zero configuration — the JSON store writes to the filesystem, so for multi-instance deployments, swap `store.ts` for a database adapter.
