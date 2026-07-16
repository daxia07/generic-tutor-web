import fs from "fs";
import path from "path";
import OpenAI from "openai";

import { getContentDir } from "../src/lib/paths";
const CONTENT_DIR = getContentDir("system-design");
const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const PROMPT_TEMPLATE = `You are a senior system design interview coach. I have an existing concept file that only has 3 questions. Add 5-7 MORE questions to bring the total to 8-10.

EXISTING CONTENT:
{existing_content}

RULES FOR NEW QUESTIONS:
1. Add questions AFTER the existing ones, numbered Q4, Q5, Q6, etc.
2. Include at least 2 scenario-type questions with "Step 1", "Step 2" thinking guidance
3. Include at least 1 fill-in-blank with all acceptable answer variants listed as separate items
4. Make difficulty progress: existing Q1-Q3 are easy; new ones should be difficulty 2-4
5. Each scenario must include a "trade_offs" field
6. stem and explanation values must be in double quotes
7. fill-in-blank answers must NOT have quotes around individual items

OUTPUT FORMAT: Output ONLY the new ### Q4, ### Q5, etc. sections in the exact same format as the existing questions. Do NOT repeat existing questions. Do NOT include any markdown code fences or commentary.

### Q4
type: [type]
stem: "[question]"
options:
  - A: [option]
correct: [answer]
explanation: "[why]"
difficulty: [1-4]`;

async function expandConcept(filepath: string) {
  const content = fs.readFileSync(filepath, "utf-8");
  const questionCount = (content.match(/### Q\d+/g) || []).length;
  const id = path.basename(filepath, ".md");

  if (questionCount >= 7) {
    console.log(`SKIP ${id} (${questionCount} questions, already sufficient)`);
    return;
  }

  console.log(`Expanding ${id} (${questionCount} -> 8+)...`);

  const prompt = PROMPT_TEMPLATE.replace("{existing_content}", content);

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 3000,
  });

  const newContent = response.choices[0]?.message?.content?.trim();
  if (!newContent) {
    console.error(`FAILED ${id}: empty response`);
    return;
  }

  if (!newContent.includes("type:")) {
    console.error(`FAILED ${id}: no type fields in response`);
    return;
  }

  // Append new questions to existing file
  const updated = content.trimEnd() + "\n\n" + newContent + "\n";
  fs.writeFileSync(filepath, updated, "utf-8");

  const newCount = (updated.match(/### Q\d+/g) || []).length;
  console.log(`OK ${id} (${questionCount} -> ${newCount} questions)`);
}

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("DEEPSEEK_API_KEY not set");
    process.exit(1);
  }

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  for (const file of files) {
    // Skip back-of-envelope (already has 9 questions)
    if (file === "back-of-envelope-estimation.md") continue;

    try {
      await expandConcept(path.join(CONTENT_DIR, file));
    } catch (err) {
      console.error(`ERROR ${file}:`, err);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\nDone! Run 'npm run seed' to load into DB.");
}

main();
