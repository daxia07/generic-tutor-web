/**
 * Apply new tables for digests / overnight / daily plans on Turso.
 * Safe to re-run (IF NOT EXISTS).
 */
import { getTursoClient } from "../src/lib/db/index";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS digests (
    id TEXT PRIMARY KEY,
    notes TEXT NOT NULL,
    feedback TEXT,
    source_type TEXT NOT NULL DEFAULT 'notes',
    signals TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'inbox',
    result TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    processed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_digests_status ON digests(status)`,
  `CREATE TABLE IF NOT EXISTS overnight_runs (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    summary TEXT NOT NULL DEFAULT '{}',
    log_path TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS daily_plans (
    id TEXT PRIMARY KEY,
    plan_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
];

async function main() {
  const client = getTursoClient();
  for (const sql of STATEMENTS) {
    await client.execute(sql);
    console.log("OK:", sql.split("\n")[0].slice(0, 60) + "…");
  }
  console.log("Schema migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
