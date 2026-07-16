/**
 * Overnight brain: process queued digests + improve MC content via DeepSeek.
 *
 * Usage:
 *   npm run overnight
 *   npm run overnight -- --dry-run
 *
 * Requires: TURSO_*, DEEPSEEK_API_KEY, optional TUTOR_DATA_DIR
 */
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { ensureDataDirs, getContentDir, getContextPacksDir, getLogsDir } from "../src/lib/paths";
import {
  listQueuedDigests,
  updateDigestStatus,
  type DigestItem,
} from "../src/lib/digests";
import {
  createRunLogPath,
  finishOvernightRun,
  saveDailyPlan,
  startOvernightRun,
  type DailyPlan,
  type PathNodePlan,
} from "../src/lib/plans";
import { db } from "../src/lib/db/index";
import { concepts, questions, answers } from "../src/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { loadAllConcepts } from "../src/lib/content";

const DRY_RUN = process.argv.includes("--dry-run");
const TOPIC = "system-design";
const MAX_DIGESTS = 5;
const MAX_CONTENT_CHANGES = 5;

function log(line: string, logFile?: string) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  console.log(msg);
  if (logFile) fs.appendFileSync(logFile, msg + "\n");
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function fetchAnalytics(logFile: string) {
  const allConcepts = await db.select().from(concepts).where(eq(concepts.topicId, TOPIC));
  const allAnswers = await db
    .select({
      questionId: answers.questionId,
      conceptId: answers.conceptId,
      correct: answers.correct,
    })
    .from(answers)
    .orderBy(desc(answers.createdAt))
    .limit(2000);

  const byQ = new Map<string, { total: number; correct: number; conceptId: string }>();
  for (const a of allAnswers) {
    const cur = byQ.get(a.questionId) || {
      total: 0,
      correct: 0,
      conceptId: a.conceptId,
    };
    cur.total++;
    if (a.correct) cur.correct++;
    byQ.set(a.questionId, cur);
  }

  const highError: string[] = [];
  for (const [qid, s] of byQ) {
    if (s.total >= 3 && s.correct / s.total < 0.4) highError.push(qid);
  }

  const zeroEngagement = allConcepts
    .filter((c) => c.status === "unseen")
    .slice(0, 10)
    .map((c) => c.id);

  log(
    `Analytics: ${allConcepts.length} concepts, ${byQ.size} answered questions, highError=${highError.length}, zeroEngagement sample=${zeroEngagement.length}`,
    logFile
  );

  return { allConcepts, highError, zeroEngagement, byQ };
}

async function processDigest(
  client: OpenAI,
  digest: DigestItem,
  logFile: string
): Promise<{ conceptId: string; title: string; questionsAdded: number } | null> {
  log(`Digest ${digest.id}: processing (${digest.sourceType})…`, logFile);
  await updateDigestStatus(digest.id, "processing");

  if (DRY_RUN) {
    await updateDigestStatus(digest.id, "queued"); // leave queued in dry-run
    log(`  dry-run: would call DeepSeek for digest ${digest.id}`, logFile);
    return null;
  }

  const system = `You are a system design interview coach. Given raw notes and the learner's feedback, produce:
1) A context pack for spaced learning
2) 4-6 multiple-choice OR scenario questions (options A-D only). No fill-in, select-all, or order.

Return JSON only:
{
  "concept": {
    "id": "kebab-case-id",
    "title": "Title",
    "difficulty": 1-5,
    "summary": "2-4 sentences",
    "keyTerms": { "Term": "def" },
    "whyItMatters": "...",
    "prerequisites": [],
    "tags": []
  },
  "contextPack": {
    "interviewAngles": ["..."],
    "tradeOffs": ["..."],
    "misconceptions": ["..."]
  },
  "questions": [
    {
      "type": "multiple-choice" | "scenario",
      "stem": "...",
      "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
      "correct": "A",
      "explanation": "...",
      "difficulty": 2,
      "trade_offs": "optional for scenario"
    }
  ]
}

Bias generation using the learner feedback and signals. Prefer judgment/trade-off MC over pure recall.`;

  const user = JSON.stringify(
    {
      notes: digest.notes,
      feedback: digest.feedback,
      signals: digest.signals,
      sourceType: digest.sourceType,
    },
    null,
    2
  );

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("empty LLM response");

    const parsed = JSON.parse(raw) as {
      concept: {
        id?: string;
        title: string;
        difficulty?: number;
        summary?: string;
        keyTerms?: Record<string, string>;
        whyItMatters?: string;
        prerequisites?: string[];
        tags?: string[];
      };
      contextPack?: Record<string, unknown>;
      questions?: Array<{
        type: string;
        stem: string;
        options: string[];
        correct: string;
        explanation: string;
        difficulty?: number;
        trade_offs?: string;
      }>;
    };

    const conceptId =
      parsed.concept.id ||
      slugify(parsed.concept.title || "digest-concept") ||
      `digest-${digest.id.slice(0, 8)}`;

    const title = parsed.concept.title || conceptId;
    const qs = (parsed.questions || []).filter(
      (q) => q.type === "multiple-choice" || q.type === "scenario"
    );

    // Write markdown under external content dir
    const contentDir = getContentDir(TOPIC);
    fs.mkdirSync(contentDir, { recursive: true });
    const mdPath = path.join(contentDir, `${conceptId}.md`);

    const keyTerms = parsed.concept.keyTerms || {};
    const keyTermsMd = Object.entries(keyTerms)
      .map(([k, v]) => `- **${k}**: ${v}`)
      .join("\n");

    let questionsMd = "";
    qs.forEach((q, i) => {
      const opts = (q.options || [])
        .map((o) => `  - ${o}`)
        .join("\n");
      questionsMd += `
### Q${i + 1}
type: ${q.type === "scenario" ? "scenario" : "multiple-choice"}
stem: ${JSON.stringify(q.stem)}
options:
${opts}
correct: ${q.correct}
explanation: ${JSON.stringify(q.explanation)}
difficulty: ${q.difficulty ?? 3}
${q.trade_offs ? `trade_offs: ${JSON.stringify(q.trade_offs)}` : ""}
`;
    });

    const md = `# ${title}

## Definition
${parsed.concept.summary || ""}

## Key Terms
${keyTermsMd || "- **TBD**: filled by digestor"}

## Why It Matters
${parsed.concept.whyItMatters || ""}

## Interview Questions
1. (generated from digestor)

## Gotchas
- See context pack misconceptions

## Questions
${questionsMd}
`;

    fs.writeFileSync(mdPath, md, "utf-8");

    // Context pack file
    const packPath = path.join(getContextPacksDir(), `${conceptId}.json`);
    fs.writeFileSync(
      packPath,
      JSON.stringify(
        {
          conceptId,
          digestId: digest.id,
          feedback: digest.feedback,
          signals: digest.signals,
          pack: parsed.contextPack || {},
          generatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf-8"
    );

    // Upsert concept + questions in Turso
    await db
      .insert(concepts)
      .values({
        id: conceptId,
        topicId: TOPIC,
        title,
        difficulty: parsed.concept.difficulty ?? 3,
        summary: parsed.concept.summary || "",
        keyTerms: JSON.stringify(keyTerms),
        whyItMatters: parsed.concept.whyItMatters || "",
        prerequisites: JSON.stringify(parsed.concept.prerequisites || []),
        tags: JSON.stringify([
          ...(parsed.concept.tags || []),
          "from-digest",
        ]),
        status: "unseen",
        ef: 2.5,
        interval: 0,
        repetitions: 0,
        filePath: mdPath,
      })
      .onConflictDoUpdate({
        target: concepts.id,
        set: {
          title,
          summary: parsed.concept.summary || "",
          keyTerms: JSON.stringify(keyTerms),
          whyItMatters: parsed.concept.whyItMatters || "",
          filePath: mdPath,
        },
      });

    const questionIds: string[] = [];
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const qId = `${conceptId}-q${i + 1}`;
      questionIds.push(qId);
      const options = (q.options || []).map((opt, idx) => {
        const m = String(opt).match(/^([A-E])\s*[:.]\s*(.+)/);
        if (m) return { id: m[1], text: m[2].trim() };
        return { id: String.fromCharCode(65 + idx), text: String(opt) };
      });

      await db
        .insert(questions)
        .values({
          id: qId,
          conceptId,
          type: q.type === "scenario" ? "scenario" : "multiple-choice",
          stem: q.stem,
          options: JSON.stringify(options),
          correctAnswer: JSON.stringify(q.correct),
          explanation: q.explanation || "",
          difficulty: q.difficulty ?? 3,
        })
        .onConflictDoUpdate({
          target: questions.id,
          set: {
            stem: q.stem,
            options: JSON.stringify(options),
            correctAnswer: JSON.stringify(q.correct),
            explanation: q.explanation || "",
            type: q.type === "scenario" ? "scenario" : "multiple-choice",
          },
        });
    }

    await updateDigestStatus(digest.id, "done", {
      result: {
        conceptId,
        title,
        questionIds,
        mdPath,
        packPath,
      },
    });

    log(
      `  ✅ digest → concept ${conceptId} (${qs.length} questions)`,
      logFile
    );
    return { conceptId, title, questionsAdded: qs.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`  ✗ digest failed: ${message}`, logFile);
    await updateDigestStatus(digest.id, "failed", { error: message });
    return null;
  }
}

async function improveContent(
  client: OpenAI,
  analytics: Awaited<ReturnType<typeof fetchAnalytics>>,
  logFile: string
) {
  if (analytics.highError.length === 0 && analytics.zeroEngagement.length === 0) {
    log("No high-error or zero-engagement targets; skip content LLM pass", logFile);
    return { changes: 0 };
  }

  if (DRY_RUN) {
    log("dry-run: would rewrite/add MC for high-error / zero-engagement", logFile);
    return { changes: 0 };
  }

  const contentDir = getContentDir(TOPIC);
  const mdFiles = fs.existsSync(contentDir)
    ? fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"))
    : [];

  // Prefer existing refresh style but options-only
  const system = `You improve system design MC questions. Output JSON:
{ "changes": [ { "file": "concept-id.md", "action": "add_question"|"update", "question_index": 0, "reason": "...", "new_content": "type: multiple-choice\\nstem: ...\\noptions:\\n  - A: ...\\ncorrect: B\\nexplanation: ...\\ndifficulty: 3" } ] }
Only multiple-choice or scenario. Max ${MAX_CONTENT_CHANGES} changes.`;

  const user = `highErrorQuestionIds: ${JSON.stringify(analytics.highError.slice(0, 15))}
zeroEngagementConcepts: ${JSON.stringify(analytics.zeroEngagement.slice(0, 8))}
files: ${mdFiles.join(", ")}
Focus on clearer stems and trade-off scenarios.`;

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });
    const raw = response.choices[0]?.message?.content;
    if (!raw) return { changes: 0 };
    const parsed = JSON.parse(raw) as {
      changes?: Array<{
        file: string;
        action: string;
        question_index: number;
        reason: string;
        new_content: string;
      }>;
    };
    let applied = 0;
    for (const change of (parsed.changes || []).slice(0, MAX_CONTENT_CHANGES)) {
      const file = change.file.endsWith(".md") ? change.file : `${change.file}.md`;
      const full = path.join(contentDir, file);
      if (!fs.existsSync(full)) {
        log(`  skip missing ${file}`, logFile);
        continue;
      }
      let current = fs.readFileSync(full, "utf-8");
      if (change.action === "add_question") {
        if (!current.includes("## Questions")) {
          current += "\n\n## Questions\n";
        }
        const existing = (current.match(/^### Q\d+$/gm) || []).length;
        const block = `\n\n### Q${existing + 1}\n${change.new_content.replace(/^### Q\d+\n?/, "")}`;
        current = current.replace(/(## Questions\n[\s\S]*)$/, `$1${block}`);
        fs.writeFileSync(full, current, "utf-8");
        applied++;
        log(`  + question in ${file}: ${change.reason}`, logFile);
      } else if (change.action === "update") {
        const qIndex = change.question_index;
        const qRegex = new RegExp(
          `(### Q${qIndex + 1}\\n[\\s\\S]*?)(?=### Q\\d+|$)`,
          "m"
        );
        const match = current.match(qRegex);
        if (match) {
          const newQ = change.new_content.replace(/^### Q\d+\n?/, "");
          current = current.replace(
            match[0],
            `### Q${qIndex + 1}\n${newQ}\n\n`
          );
          fs.writeFileSync(full, current, "utf-8");
          applied++;
          log(`  ~ Q${qIndex + 1} in ${file}: ${change.reason}`, logFile);
        }
      }
    }
    return { changes: applied };
  } catch (err) {
    log(`content improve error: ${err}`, logFile);
    return { changes: 0 };
  }
}

async function buildTomorrowPlan(
  digestResults: Array<{ conceptId: string; title: string }>,
  logFile: string
): Promise<DailyPlan> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = tomorrow.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const due = await db
    .select()
    .from(concepts)
    .where(
      sql`${concepts.topicId} = ${TOPIC} AND ${concepts.status} IN ('learning', 'reviewing') AND (${concepts.nextReview} IS NULL OR ${concepts.nextReview} <= ${today})`
    )
    .limit(3);

  const unseen = await db
    .select()
    .from(concepts)
    .where(
      sql`${concepts.topicId} = ${TOPIC} AND ${concepts.status} = 'unseen'`
    )
    .orderBy(concepts.difficulty)
    .limit(2);

  const nodes: PathNodePlan[] = [];
  for (const c of due) {
    nodes.push({
      conceptId: c.id,
      title: c.title,
      kind: "review",
      estimatedMinutes: 4,
    });
  }
  for (const r of digestResults) {
    if (!nodes.some((n) => n.conceptId === r.conceptId)) {
      nodes.push({
        conceptId: r.conceptId,
        title: r.title,
        kind: "new",
        estimatedMinutes: 6,
      });
    }
  }
  for (const c of unseen) {
    if (nodes.length >= 5) break;
    if (!nodes.some((n) => n.conceptId === c.id)) {
      nodes.push({
        conceptId: c.id,
        title: c.title,
        kind: "new",
        estimatedMinutes: 5,
      });
    }
  }

  const plan: DailyPlan = {
    date,
    nodes,
    digestIdsProcessed: [],
    notes: `Generated overnight. ${nodes.length} path nodes.`,
    generatedAt: new Date().toISOString(),
  };

  if (!DRY_RUN) {
    await saveDailyPlan(plan);
    // also write today plan if missing so home can show something
    const todayPlan = { ...plan, date: today };
    await saveDailyPlan(todayPlan);
  }
  log(`Plan for ${date}: ${nodes.map((n) => n.title).join(" · ")}`, logFile);
  return plan;
}

async function main() {
  ensureDataDirs();
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("DEEPSEEK_API_KEY not set");
    process.exit(1);
  }

  const runId = crypto.randomUUID();
  const logFile = createRunLogPath(runId);
  await startOvernightRun(runId, logFile);
  log(`=== Overnight start ${runId} dry=${DRY_RUN} ===`, logFile);
  log(`Content dir: ${getContentDir(TOPIC)}`, logFile);

  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });

  const summary: Record<string, unknown> = {
    digestsProcessed: 0,
    digestsFailed: 0,
    contentChanges: 0,
    conceptsFromDigest: [] as string[],
  };

  try {
    const queued = (await listQueuedDigests()).slice(0, MAX_DIGESTS);
    log(`Queued digests: ${queued.length}`, logFile);

    const digestResults: Array<{ conceptId: string; title: string }> = [];
    for (const d of queued) {
      const result = await processDigest(client, d, logFile);
      if (result) {
        digestResults.push(result);
        (summary.conceptsFromDigest as string[]).push(result.conceptId);
        summary.digestsProcessed = (summary.digestsProcessed as number) + 1;
      } else if (!DRY_RUN) {
        summary.digestsFailed = (summary.digestsFailed as number) + 1;
      }
    }

    const analytics = await fetchAnalytics(logFile);
    const improve = await improveContent(client, analytics, logFile);
    summary.contentChanges = improve.changes;

    const plan = await buildTomorrowPlan(digestResults, logFile);
    summary.planDate = plan.date;
    summary.planNodes = plan.nodes.length;

    // Soft hint: content on disk may need re-seed for non-digest files
    const diskConcepts = loadAllConcepts().length;
    log(`Disk concepts parseable: ${diskConcepts}`, logFile);

    await finishOvernightRun(runId, "success", summary);
    log(`=== Overnight success ${JSON.stringify(summary)} ===`, logFile);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    summary.error = message;
    await finishOvernightRun(runId, "failed", summary);
    log(`=== Overnight FAILED ${message} ===`, logFile);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
