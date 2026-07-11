import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import OpenAI from "openai";

const CONTENT_DIR = path.join(process.cwd(), "content", "system-design");
const MAX_CHANGES = 5;
const DRY_RUN = process.argv.includes("--dry-run");

interface QuestionAnalytics {
  id: string;
  type: string;
  difficulty: number;
  stem: string;
  totalAttempts: number;
  correctCount: number;
  accuracy: number | null;
  avgSm2Grade: number | null;
}

interface ConceptAnalytics {
  id: string;
  title: string;
  status: string;
  ef: number;
  interval: number;
  repetitions: number;
  lastGrade: number | null;
  questions: QuestionAnalytics[];
}

interface ProgressData {
  generatedAt: string;
  summary: { totalQuestions: number; totalAnswers: number; avgAccuracy: number };
  concepts: ConceptAnalytics[];
  needsAttention: {
    highErrorRate: string[];
    zeroEngagement: string[];
    tooEasy: string[];
  };
}

const SYSTEM_PROMPT = `You are a system design interview content curator. Given progress analytics and existing question content, generate improved questions.

Rules:
1. Convert fill-in-blank questions to scenario-based unless the blank is a critical keyword (token bucket, idempotency key, strangler fig, consensus, Protobuf, snapshot, health check, composite index, exactly-once). When keeping fill-in-blank, list all acceptable answer variants (e.g. "half-open" and "half open") as separate items in the answers list.
2. Add "scenario" type questions: present a real-world constraint, ask for architecture choice + justification
3. Questions must have clear correct answers but test JUDGMENT not recall
4. Each scenario question must include a "trade_offs" field explaining when the "correct" answer might not be optimal
5. Keep difficulty progression: Q1 (foundation), Q2 (application), Q3 (scenario/trade-off)
6. Mark deprecated questions with "deprecated: true" in a comment, do not delete them
7. For high-error-rate questions: rewrite the stem to be clearer, keep the same concept
8. For zero-engagement concepts: generate 1-2 new scenario questions to make them more engaging
9. For too-easy questions: add a harder follow-up question (difficulty +1 or +2)
10. Output valid markdown in the exact same format as the input

Question type formats:
- multiple-choice: type, stem, options (list of "X: text"), correct (single letter), explanation, difficulty
- fill-in-blank: type, stem (with ______), answers (list of alternative acceptable answers for the single blank), explanation, difficulty
- If a question has multiple blanks, use multiple ______ in the stem and group answers per blank using nested lists
- select-all: type, stem, options (list of "X: text"), correct (list of letters), explanation, difficulty
- order: type, stem, items (list), correct_order (array of 0-based indices), explanation, difficulty
- scenario: type, stem (real-world scenario), options (list of "X: text"), correct (single letter), explanation, trade_offs, difficulty

Output JSON with this structure:
{
  "changes": [
    {
      "file": "concept-id.md",
      "action": "update" | "add_question",
      "question_index": 2,
      "reason": "high error rate (23% accuracy)" | "zero engagement" | "too easy" | "fill-in-blank → scenario",
      "new_content": "### Q2\\ntype: scenario\\nstem: \\"...\\"\\n..."
    }
  ]
}

Only propose changes for questions that need improvement. Maximum ${MAX_CHANGES} changes per run.`;

async function refreshContent() {
  const progressPath = process.argv.find((a) => !a.startsWith("--") && a !== process.argv[0] && a !== process.argv[1]);
  if (!progressPath) {
    console.error("Usage: npx tsx scripts/llm-refresh-content.ts <progress.json> [--dry-run]");
    process.exit(1);
  }

  const progressData: ProgressData = JSON.parse(fs.readFileSync(progressPath, "utf-8"));

  const mdFiles = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"));

  const existingContent: Record<string, string> = {};
  for (const f of mdFiles) {
    existingContent[f.replace(".md", "")] = fs.readFileSync(path.join(CONTENT_DIR, f), "utf-8");
  }

  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });

  const needsAttentionSummary = {
    highErrorRate: progressData.needsAttention.highErrorRate,
    zeroEngagement: progressData.needsAttention.zeroEngagement,
    tooEasy: progressData.needsAttention.tooEasy,
  };

  const userMessage = `Progress analytics:
${JSON.stringify(needsAttentionSummary, null, 2)}

Concept details:
${JSON.stringify(
  progressData.concepts.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    questions: c.questions.map((q) => ({
      id: q.id,
      type: q.type,
      stem: q.stem,
      totalAttempts: q.totalAttempts,
      accuracy: q.accuracy,
    })),
  })),
  null,
  2
)}

Existing content files:
${mdFiles.join(", ")}

Analyze the progress data and propose content improvements. Focus on:
1. Questions with high error rates — rewrite for clarity
2. Zero-engagement concepts — add engaging scenario questions
3. Too-easy questions — add harder follow-ups
4. Fill-in-blank questions that test vocabulary recall — convert to scenario type. For remaining fill-in-blanks, include all common answer variants

Return only the JSON changes object.`;

  console.log("Calling DeepSeek API...");
  console.log(`Dry run: ${DRY_RUN}`);

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    console.error("Empty response from LLM");
    process.exit(1);
  }

  let parsed: { changes: Array<{ file: string; action: string; question_index: number; reason: string; new_content: string }> };
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse LLM response as JSON:");
    console.error(content.substring(0, 500));
    process.exit(1);
  }

  const changes = parsed.changes || [];
  console.log(`\nLLM proposed ${changes.length} changes (max ${MAX_CHANGES} will be applied):\n`);

  const applied: typeof changes = [];

  for (const change of changes.slice(0, MAX_CHANGES)) {
    console.log(`  [${change.action}] ${change.file} Q${change.question_index + 1}: ${change.reason}`);

    if (DRY_RUN) {
      console.log(`    (dry run — not applying)`);
      console.log(`    Preview:\n${change.new_content.substring(0, 200)}...\n`);
      continue;
    }

    const filePath = path.join(CONTENT_DIR, change.file.endsWith(".md") ? change.file : `${change.file}.md`);
    if (!fs.existsSync(filePath)) {
      console.warn(`    File not found: ${filePath} — skipping`);
      continue;
    }

    const currentContent = fs.readFileSync(filePath, "utf-8");

    if (change.action === "add_question") {
      const questionsMatch = currentContent.match(/## Questions\n([\s\S]*)$/);
      if (questionsMatch) {
        const existingQCount = (questionsMatch[1].match(/^### Q\d+$/gm) || []).length;
        const newQLabel = `Q${existingQCount + 1}`;
        const newSection = `\n\n### ${newQLabel}\n${change.new_content.replace(/^### Q\d+\n?/, "")}`;
        const updated = currentContent.replace(/(## Questions\n[\s\S]*)$/, `$1${newSection}`);
        fs.writeFileSync(filePath, updated, "utf-8");
        console.log(`    ✅ Added Q${newQLabel} to ${change.file}`);
      }
    } else if (change.action === "update") {
      const qIndex = change.question_index;
      const qRegex = new RegExp(`(### Q${qIndex + 1}\\n[\\s\\S]*?)(?=### Q\\d+|$)`, "m");
      const match = currentContent.match(qRegex);
      if (match) {
        const newQContent = change.new_content.replace(/^### Q\d+\n?/, "");
        const updated = currentContent.replace(match[0], `### Q${qIndex + 1}\n${newQContent}\n\n`);
        fs.writeFileSync(filePath, updated, "utf-8");
        console.log(`    ✅ Updated Q${qIndex + 1} in ${change.file}`);
      } else {
        console.warn(`    Could not find Q${qIndex + 1} in ${change.file} — skipping`);
      }
    }

    applied.push(change);
  }

  // Validate that modified files still parse correctly
  if (!DRY_RUN && applied.length > 0) {
    const modifiedFiles = [...new Set(applied.map((c) => c.file.endsWith(".md") ? c.file : `${c.file}.md`))];
    let parseErrors = 0;
    for (const file of modifiedFiles) {
      const fullPath = path.join(CONTENT_DIR, file);
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const questionsSection = raw.match(/## Questions\n([\s\S]*)$/);
        if (!questionsSection) {
          console.warn(`  ⚠️  ${file}: no ## Questions section found`);
          parseErrors++;
          continue;
        }
        const qCount = (questionsSection[1].match(/^### Q\d+$/gm) || []).length;
        const hasType = /^type:/gm.test(questionsSection[1]);
        if (qCount === 0 || !hasType) {
          console.warn(`  ⚠️  ${file}: ${qCount} questions, has type fields: ${hasType} — content may be malformed`);
          parseErrors++;
        } else {
          console.log(`  ✓ ${file}: ${qCount} questions, format looks OK`);
        }
      } catch (err) {
        console.error(`  ✗ ${file}: read error — ${err}`);
        parseErrors++;
      }
    }
    if (parseErrors > 0) {
      console.error(`\n⚠️  ${parseErrors} file(s) had parse errors! Reverting changes.`);
      for (const file of modifiedFiles) {
        const fullPath = path.join(CONTENT_DIR, file);
        execSync(`git checkout -- ${fullPath}`);
      }
      process.exit(1);
    }
  }

  if (DRY_RUN) {
    console.log(`\nDry run complete. ${changes.length} changes proposed, 0 applied.`);
  } else {
    console.log(`\nApplied ${applied.length}/${changes.length} changes.`);
    if (applied.length > 0) {
      console.log(`\nNext steps:`);
      console.log(`  1. Review changes: git diff content/`);
      console.log(`  2. Re-seed DB: npx tsx src/lib/db/seed.ts`);
      console.log(`  3. Test locally: npm run dev`);
    }
  }
}

refreshContent().catch(console.error);
