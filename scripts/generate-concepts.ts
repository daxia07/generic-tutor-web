import fs from "fs";
import path from "path";
import OpenAI from "openai";

const CONTENT_DIR = path.join(process.cwd(), "content", "system-design");

function getClient(): OpenAI {
  return new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
  });
}

interface ConceptDef {
  id: string;
  title: string;
  difficulty: number;
  description: string;
}

const NEW_CONCEPTS: ConceptDef[] = [
  {
    id: "design-chat-system",
    title: "Design a Chat System",
    difficulty: 3,
    description:
      "WhatsApp/Messenger-style real-time messaging. WebSocket, presence, fan-out strategies for 1:1 vs group chat, message ordering with sequence numbers, delivery guarantees, offline message sync.",
  },
  {
    id: "design-news-feed",
    title: "Design a News Feed System",
    difficulty: 3,
    description:
      "Twitter/Instagram-style feed. Fan-out on write vs read, ranking algorithms, pre-computation vs real-time, caching strategies, pagination with cursors.",
  },
  {
    id: "design-search-system",
    title: "Design a Search System",
    difficulty: 3,
    description:
      "Google/autocomplete-style search. Inverted index, trie for prefix matching, sharding search indices, ranking (TF-IDF, PageRank), autocomplete latency optimization.",
  },
  {
    id: "design-key-value-store",
    title: "Design a Key-Value Store",
    difficulty: 3,
    description:
      "Dynamo/Cassandra-style KV store. Consistent hashing, replication, vector clocks for conflict resolution, SSTables and LSM trees, bloom filters, compaction strategies, read repair, hinted handoff.",
  },
  {
    id: "design-notification-system",
    title: "Design a Notification System",
    difficulty: 2,
    description:
      "Push notifications, email, SMS delivery. Fan-out on write, device token management, rate limiting per user, template rendering, delivery tracking and analytics.",
  },
  {
    id: "design-url-shortener",
    title: "Design a URL Shortener",
    difficulty: 2,
    description:
      "bit.ly-style URL shortening. Base62 encoding, ID generation (auto-increment vs UUID), 301 vs 302 redirects, analytics tracking, cache layer for hot URLs.",
  },
  {
    id: "design-web-crawler",
    title: "Design a Web Crawler",
    difficulty: 3,
    description:
      "Googlebot-style distributed crawler. URL frontier with priority queues, politeness per domain, deduplication (Bloom filter), distributed crawling with coordination, handling dynamic content.",
  },
  {
    id: "design-video-streaming",
    title: "Design a Video Streaming Platform",
    difficulty: 3,
    description:
      "YouTube/Netflix-style video streaming. Chunked upload, transcoding pipeline, adaptive bitrate (HLS/DASH), CDN strategy, pre-warming, view count aggregation.",
  },
  {
    id: "distributed-transactions",
    title: "Distributed Transactions",
    difficulty: 4,
    description:
      "2PC, 3PC, Saga pattern (choreography vs orchestration), compensating transactions, outbox pattern, exactly-once semantics, idempotency in distributed systems.",
  },
  {
    id: "auth-system-design",
    title: "Authentication & Authorization Design",
    difficulty: 3,
    description:
      "OAuth 2.0 flows, JWT vs session-based auth, SSO with SAML/OIDC, RBAC vs ABAC, token refresh rotation, API key management, rate limiting per identity.",
  },
];

function buildPrompt(concept: ConceptDef): string {
  const lines: string[] = [];
  lines.push('You are a senior system design interview coach. Create a complete concept file for: "' + concept.title + '"');
  lines.push("");
  lines.push("Topic: " + concept.description);
  lines.push("Difficulty level: " + concept.difficulty + "/5");
  lines.push("");
  lines.push("IMPORTANT: You must create 8-10 questions with this exact distribution:");
  lines.push("- 2-3 multiple-choice (difficulty 1-2): test foundational knowledge");
  lines.push("- 2-3 fill-in-blank (difficulty 1-3): test key terminology, list ALL acceptable answer variants");
  lines.push("- 1-2 select-all (difficulty 2-3): test multi-facet understanding");
  lines.push("- 2-4 scenario (difficulty 2-4): STEP-BY-STEP THINKING questions. These are critical!");
  lines.push("");
  lines.push('For SCENARIO questions, use "Step 1", "Step 2", "Step 3" in the stem to guide the student through the thinking process. Each step builds on the previous one, teaching HOW to reason about the design. Include a "trade_offs" field.');
  lines.push("");
  lines.push("CRITICAL FORMAT RULES:");
  lines.push("1. stem values must be in double quotes");
  lines.push("2. explanation values must be in double quotes");
  lines.push("3. fill-in-blank answers must NOT have quotes around individual items");
  lines.push("4. trade_offs values must be in double quotes");
  lines.push("");
  lines.push("Output EXACTLY this markdown format (no code fences, no extra commentary):");
  lines.push("");
  lines.push("# " + concept.title);
  lines.push("");
  lines.push("## Definition");
  lines.push("[One clear paragraph]");
  lines.push("");
  lines.push("## Key Terms");
  lines.push("- **Term**: Definition");
  lines.push("- **Term2**: Definition2");
  lines.push("");
  lines.push("## Why It Matters");
  lines.push("[1-2 paragraphs about why this is important for interviews]");
  lines.push("");
  lines.push("## Interview Questions");
  lines.push('1. "Question"');
  lines.push('2. "Question"');
  lines.push('3. "Question"');
  lines.push("");
  lines.push("## Gotchas");
  lines.push("- Common mistake explanation");
  lines.push("- Another mistake");
  lines.push("");
  lines.push("## Questions");
  lines.push("");
  lines.push("### Q1");
  lines.push("type: multiple-choice");
  lines.push('stem: "Question text"');
  lines.push("options:");
  lines.push("  - A: Option text");
  lines.push("  - B: Option text");
  lines.push("  - C: Option text");
  lines.push("  - D: Option text");
  lines.push("correct: B");
  lines.push('explanation: "Why B is correct"');
  lines.push("difficulty: 1");
  lines.push("");
  lines.push("### Q2");
  lines.push("type: fill-in-blank");
  lines.push('stem: "Text with ______ blank"');
  lines.push("answers:");
  lines.push("  - answer1");
  lines.push("  - answer2");
  lines.push('explanation: "Why"');
  lines.push("difficulty: 2");
  lines.push("");
  lines.push("### Q3");
  lines.push("type: select-all");
  lines.push('stem: "Which of these apply?"');
  lines.push("options:");
  lines.push("  - A: Option");
  lines.push("  - B: Option");
  lines.push("  - C: Option");
  lines.push("correct:");
  lines.push("  - A");
  lines.push("  - C");
  lines.push('explanation: "Why A and C"');
  lines.push("difficulty: 2");
  lines.push("");
  lines.push("### Q4");
  lines.push("type: scenario");
  lines.push('stem: "Step 1 - Context. What should you consider first?"');
  lines.push("options:");
  lines.push("  - A: Option");
  lines.push("  - B: Option");
  lines.push("correct: A");
  lines.push('explanation: "Why A"');
  lines.push('trade_offs: "When A might not be best"');
  lines.push("difficulty: 3");
  return lines.join("\n");
}

async function generateConcept(concept: ConceptDef) {
  const filepath = path.join(CONTENT_DIR, concept.id + ".md");
  if (fs.existsSync(filepath)) {
    console.log("SKIP " + concept.id + " (already exists)");
    return;
  }

  const prompt = buildPrompt(concept);
  console.log("Generating " + concept.id + "...");

  const client = getClient();
  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    console.error("FAILED " + concept.id + ": empty response");
    return;
  }

  if (!content.includes("## Questions") || !content.includes("type:")) {
    console.error("FAILED " + concept.id + ": missing Questions section or type fields");
    return;
  }

  const questionCount = (content.match(/### Q\d+/g) || []).length;
  if (questionCount < 6) {
    console.error("FAILED " + concept.id + ": only " + questionCount + " questions (need 6+)");
    return;
  }

  fs.writeFileSync(filepath, content, "utf-8");
  console.log("OK " + concept.id + " (" + questionCount + " questions)");
}

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("DEEPSEEK_API_KEY not set");
    process.exit(1);
  }

  for (const concept of NEW_CONCEPTS) {
    try {
      await generateConcept(concept);
    } catch (err) {
      console.error("ERROR " + concept.id + ":", err);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\nDone! Run 'npm run seed' to load into DB.");
}

main();
