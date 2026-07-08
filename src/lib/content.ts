// ---------------------------------------------------------------------------
// Markdown content loader — parses concept files into structured data
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Concept } from "./types";

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
}

function parseSections(markdown: string): ParsedSections {
  const result: ParsedSections = {
    definition: "",
    keyTerms: {},
    whyItMatters: "",
    interviewQuestions: [],
    gotchas: [],
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
  // Pattern: **Term**: definition or - **Term**: definition
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
