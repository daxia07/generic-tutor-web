// ---------------------------------------------------------------------------
// Markdown content loader — parses concept files into structured data
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Concept, Question, QuestionType } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "system-design");

/**
 * Parse a single concept markdown file.
 * Handles both YAML frontmatter and plain markdown.
 */
export function loadConcept(filePath: string): Concept {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  // Extract sections from markdown body
  const sections = parseSections(content);

  // Derive ID from filename
  const id = data.id || path.basename(filePath, ".md");

  return {
    id,
    title: data.title || sections.title || id.replace(/-/g, " "),
    difficulty: data.difficulty ?? 3,
    summary: sections.definition || "",
    keyTerms: sections.keyTerms,
    whyItMatters: sections.whyItMatters || "",
    interviewQuestions: sections.interviewQuestions,
    gotchas: sections.gotchas,
    prerequisites: data.prerequisites || [],
    tags: data.tags || [],
    questions: sections.questions,
  };
}

/**
 * Load all concepts from the content directory.
 */
export function loadAllConcepts(): Concept[] {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.warn(`Content directory not found: ${CONTENT_DIR}`);
    return [];
  }

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"));

  return files
    .map((f) => {
      try {
        return loadConcept(path.join(CONTENT_DIR, f));
      } catch (err) {
        console.warn(`Failed to parse ${f}:`, err);
        return null;
      }
    })
    .filter(Boolean) as Concept[];
}

/**
 * Get a single concept by ID.
 */
export function getConcept(id: string): Concept | null {
  const filePath = path.join(CONTENT_DIR, `${id}.md`);
  if (!fs.existsSync(filePath)) return null;
  return loadConcept(filePath);
}

/**
 * Get all concept IDs (for initializing new learners).
 */
export function getAllConceptIds(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.basename(f, ".md"));
}

// ---------------------------------------------------------------------------
// Section parser — extracts structured data from markdown headings
// ---------------------------------------------------------------------------

interface ParsedSections {
  title?: string;
  definition: string;
  keyTerms: Record<string, string>;
  whyItMatters: string;
  interviewQuestions: string[];
  gotchas: string[];
  questions: Question[];
}

function parseSections(markdown: string): ParsedSections {
  const result: ParsedSections = {
    definition: "",
    keyTerms: {},
    whyItMatters: "",
    interviewQuestions: [],
    gotchas: [],
    questions: [],
  };

  // Split by ## headings
  const sectionRegex = /^## (.+)$/gm;
  const sections = splitByHeadings(markdown, sectionRegex);

  for (const [heading, body] of Object.entries(sections)) {
    const h = heading.toLowerCase().trim();
    const clean = body.trim();

    if (h === "definition") {
      result.definition = clean;
    } else if (h === "key terms" || h === "key terms:") {
      result.keyTerms = parseKeyTerms(clean);
    } else if (h.includes("why it matters") || h === "importance") {
      result.whyItMatters = clean;
    } else if (h.includes("interview question") || h.includes("practice")) {
      result.interviewQuestions = parseListItems(clean);
    } else if (h.includes("gotcha") || h.includes("watch out") || h.includes("pitfall") || h.includes("common mistake")) {
      result.gotchas = parseListItems(clean);
    } else if (h === "questions") {
      result.questions = parseQuestions(clean);
    }
  }

  // Also try to extract title from H1
  const h1Match = markdown.match(/^# (.+)$/m);
  if (h1Match) {
    result.title = h1Match[1].trim();
  }

  return result;
}

function splitByHeadings(
  text: string,
  regex: RegExp
): Record<string, string> {
  const result: Record<string, string> = {};
  let lastHeading = "__preamble__";
  let lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (lastHeading) {
      result[lastHeading] = text.slice(lastIndex, match.index).trim();
    }
    lastHeading = match[1].trim();
    lastIndex = match.index + match[0].length;
  }
  // Capture last section
  result[lastHeading] = text.slice(lastIndex).trim();

  return result;
}

function parseKeyTerms(text: string): Record<string, string> {
  const terms: Record<string, string> = {};
  const lines = text.split("\n");
  for (const line of lines) {
    const match = line.match(/[-*]\s+\*\*(.+?)\*\*:?\s*(.+)/);
    if (match) {
      terms[match[1].trim()] = match[2].trim();
    }
  }
  return terms;
}

function parseListItems(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => line.match(/^(\d+\.|[-*])\s/))
    .map((line) => line.replace(/^(\d+\.|[-*])\s*/, "").trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Question parser — extracts structured questions from ## Questions section
// ---------------------------------------------------------------------------

function parseQuestions(text: string): Question[] {
  const questions: Question[] = [];
  
  // Split by ### Q1, ### Q2, etc.
  const qRegex = /^### (Q\d+)\s*$/gm;
  const qSections = splitByHeadings(text, qRegex);
  
  for (const [qLabel, qBody] of Object.entries(qSections)) {
    if (qLabel === "__preamble__") continue;
    
    const qData = parseQuestionKeyValue(qBody.trim());
    if (!qData) continue;
    
    const qIndex = qLabel.replace("Q", "");
    const conceptId = ""; // Will be set by the caller
    const qId = `${conceptId}-q${qIndex}`;
    
    const type = (qData.type || "multiple-choice") as QuestionType;
    const stem = qData.stem || "";
    const explanation = qData.explanation || "";
    const difficulty = parseInt(qData.difficulty || "3", 10);
    
    let question: Question;
    
    switch (type) {
      case "multiple-choice": {
        const options = qData.options || [];
        const correctAnswer = qData.correct || "";
        question = {
          id: qId,
          conceptId,
          type: "multiple-choice",
          stem,
          options: parseOptions(options),
          correctAnswer,
          explanation,
          difficulty,
        };
        break;
      }
      case "fill-in-blank": {
        const rawAnswers = qData.answers || [];
        const blankCount = (stem.match(/_{2,}/g) || []).length || 1;
        const answers: string[][] = [];
        if (blankCount === 1) {
          answers.push(Array.isArray(rawAnswers) ? rawAnswers : [rawAnswers]);
        } else {
          for (const a of rawAnswers) {
            answers.push([a]);
          }
        }
        question = {
          id: qId,
          conceptId,
          type: "fill-in-blank",
          stem,
          blanks: blankCount,
          answers,
          explanation,
          difficulty,
          hint: qData.hint,
          wordBank: qData.word_bank ? parseWordBank(qData.word_bank) : undefined,
        };
        break;
      }
      case "select-all": {
        const options = qData.options || [];
        const correctAnswers = qData.correct || [];
        question = {
          id: qId,
          conceptId,
          type: "select-all",
          stem,
          options: parseOptions(options),
          correctAnswers: Array.isArray(correctAnswers) ? correctAnswers : [correctAnswers],
          explanation,
          difficulty,
        };
        break;
      }
      case "order": {
        const items = qData.items || [];
        const correctOrder = qData.correct_order || [];
        question = {
          id: qId,
          conceptId,
          type: "order",
          stem,
          items: Array.isArray(items) ? items : [],
          correctOrder: Array.isArray(correctOrder) ? correctOrder.map(Number) : [],
          explanation,
          difficulty,
        };
        break;
      }
      case "scenario": {
        const options = qData.options || [];
        const correctAnswer = qData.correct || "";
        question = {
          id: qId,
          conceptId,
          type: "scenario",
          stem,
          options: parseOptions(options),
          correctAnswer: typeof correctAnswer === "string" ? correctAnswer : String(correctAnswer),
          explanation,
          difficulty,
          tradeOffs: qData.trade_offs || undefined,
        };
        break;
      }
      default:
        continue;
    }
    
    questions.push(question);
  }
  
  return questions;
}

/**
 * Parse key-value pairs from a question block.
 * Format:
 *   type: multiple-choice
 *   stem: "Which caching strategy..."
 *   options:
 *     - A: Cache-aside
 *     - B: Write-through
 *   correct: B
 *   explanation: "Write-through..."
 */
function parseQuestionKeyValue(text: string): Record<string, any> | null {
  if (!text.trim()) return null;
  
  const result: Record<string, any> = {};
  const lines = text.split("\n");
  let currentKey = "";
  let inList = false;
  let listItems: string[] = [];
  
  for (const line of lines) {
    // List item (indented with -)
    const listMatch = line.match(/^\s+-\s+(.+)/);
    if (listMatch && inList) {
      listItems.push(listMatch[1].trim());
      continue;
    }
    
    // Key-value pair
    const kvMatch = line.match(/^(\w[\w_-]*)\s*:\s*(.*)/);
    if (kvMatch) {
      // Save previous list
      if (inList && listItems.length > 0) {
        result[currentKey] = listItems;
        listItems = [];
      }
      
      currentKey = kvMatch[1].trim().toLowerCase();
      const value = kvMatch[2].trim();
      
      // Check if this key starts a list (value is empty)
      if (!value) {
        inList = true;
        listItems = [];
      } else {
        inList = false;
        // Try to parse as JSON, otherwise keep as string
        if (value.startsWith("[") || value.startsWith("{")) {
          try {
            result[currentKey] = JSON.parse(value);
          } catch {
            result[currentKey] = value;
          }
        } else {
          // Strip surrounding quotes
          result[currentKey] = value.replace(/^["']|["']$/g, "");
        }
      }
      continue;
    }
    
    // Continuation of previous value
    if (currentKey && !inList && line.trim()) {
      result[currentKey] = (result[currentKey] || "") + " " + line.trim();
    }
  }
  
  // Save final list
  if (inList && listItems.length > 0) {
    result[currentKey] = listItems;
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

function parseOptions(options: string | string[]): { id: string; text: string }[] {
  if (Array.isArray(options)) {
    return options.map((opt, i) => {
      // Format: "A: Cache-aside" or just "Cache-aside"
      const match = String(opt).match(/^([A-E])\s*[:.]\s*(.+)/);
      if (match) {
        return { id: match[1], text: match[2].trim() };
      }
      return { id: String.fromCharCode(65 + i), text: String(opt) };
    });
  }
  return [];
}

function parseWordBank(bank: string | string[]): string[] {
  if (Array.isArray(bank)) return bank.map(String);
  if (typeof bank === "string") {
    try {
      return JSON.parse(bank);
    } catch {
      return bank.split(",").map((s) => s.trim());
    }
  }
  return [];
}
