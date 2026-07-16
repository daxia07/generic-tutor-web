# Tutor Web — Duolingo-style system design trainer

Gamified spaced-repetition app for system design interviews. Coach **Pip** guides **options-only** lessons. Digests (notes + your feedback) feed an overnight DeepSeek job that rewrites questions and rebuilds tomorrow’s path.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Turso (libSQL) for progress / digests / plans
- SM-2 scheduling
- DeepSeek for overnight content + digestor pipeline
- Content **outside git**: `~/workspace/generic-tutor-web` (`TUTOR_DATA_DIR`)

## Docs

- [docs/FEATURES.md](docs/FEATURES.md) — product surfaces
- [docs/DECISIONS.md](docs/DECISIONS.md) — ADRs (external content, options-only, digest → overnight, Pip, UX)

## Quick start

```bash
cp .env.example .env.local   # Turso + DEEPSEEK_API_KEY + TUTOR_DATA_DIR
npm install
npm run migrate:schema
npm run seed                 # load concepts from TUTOR_DATA_DIR into Turso
npm run dev                  # http://localhost:3099
```

## Data layout (not in git)

```
~/workspace/generic-tutor-web/
  content/system-design/   # markdown concepts + questions
  digests/                 # JSON mirrors of captures
  context-packs/           # digestor output
  plans/                   # daily path plans
  logs/                    # overnight logs
```

## Overnight

```bash
npm run overnight            # process digests + improve MC + write plan
npm run overnight:dry
npm run overnight:install-cron   # 3:00 AM via crontab
```

## App surfaces

| Route | Purpose |
|-------|---------|
| `/` | Learning path (Home) |
| `/session` | Lesson — Pip + options only |
| `/digest` | Notes + feedback inbox → queue for tonight |
| `/plan` | Overnight status + tomorrow path |
| `/me` | Stats + logout |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server :3099 |
| `npm run seed` | Seed Turso from external content |
| `npm run migrate:schema` | Create digests / overnight / plans tables |
| `npm run overnight` | Overnight pipeline |
| `npm run refresh` | Legacy progress-driven LLM refresh |
