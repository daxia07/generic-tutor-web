"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import type { Question } from "@/lib/types";

interface FillInBlankProps {
  question: Question;
  onAnswer: (answer: string[], isCorrect: boolean) => void;
  disabled?: boolean;
}

export function FillInBlank({
  question,
  onAnswer,
  disabled = false,
}: FillInBlankProps) {
  if (question.type !== "fill-in-blank") return null;

  const { stem, blanks, answers, hint, wordBank, explanation } = question;
  const hasWordBank = !!(wordBank && wordBank.length > 0);

  const [filledBlanks, setFilledBlanks] = useState<(string | null)[]>(
    Array(blanks).fill(null)
  );
  const [activeBlank, setActiveBlank] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [blankResults, setBlankResults] = useState<boolean[]>([]);

  // Find the next empty blank index
  function nextEmptyBlank(from: number): number {
    for (let i = from; i < blanks; i++) {
      if (!filledBlanks[i]) return i;
    }
    for (let i = 0; i < from; i++) {
      if (!filledBlanks[i]) return i;
    }
    return -1;
  }

  function handleWordBankSelect(word: string) {
    if (submitted) return;
    const target = nextEmptyBlank(0);
    if (target === -1) return;

    const newBlanks = [...filledBlanks];
    newBlanks[target] = word;
    setFilledBlanks(newBlanks);
    setActiveBlank(nextEmptyBlank(target + 1));
  }

  function handleBlankClick(index: number) {
    if (submitted) return;
    if (hasWordBank) {
      // Remove word from blank, put it back in bank
      const newBlanks = [...filledBlanks];
      newBlanks[index] = null;
      setFilledBlanks(newBlanks);
      setActiveBlank(index);
    } else {
      setActiveBlank(index);
    }
  }

  function handleInputChange(index: number, value: string) {
    if (submitted) return;
    const newBlanks = [...filledBlanks];
    newBlanks[index] = value || null;
    setFilledBlanks(newBlanks);
  }

  function handleSubmit() {
    if (submitted) return;
    const allFilled = filledBlanks.every((b) => b !== null && b !== "");
    if (!allFilled) return;

    const results = filledBlanks.map((blank, i) => {
      if (!blank) return false;
      return blank.trim().toLowerCase() === answers[i].trim().toLowerCase();
    });

    setBlankResults(results);
    setSubmitted(true);

    const isCorrect = results.every((r) => r);
    const isPartial = !isCorrect && results.some((r) => r);
    onAnswer(
      filledBlanks.map((b) => b || ""),
      isCorrect || isPartial ? isCorrect : false
    );
  }

  function handleSkip() {
    if (submitted) return;
    setFilledBlanks(answers.slice());
    setBlankResults(answers.map(() => false));
    setSubmitted(true);
    onAnswer(answers, false);
  }

  // Split stem by ____ placeholders
  const parts = stem.split(/_{2,}/g);

  // Used words for word bank
  const usedWords = new Set(filledBlanks.filter(Boolean));

  return (
    <div className="space-y-4">
      {question.isReview && (
        <div className="inline-flex items-center gap-1 text-xs font-medium text-[#ff9600] bg-[#fff0e0] rounded-full px-2.5 py-0.5">
          🔄 Review
        </div>
      )}

      {/* Stem with blanks */}
      <div className="text-lg font-semibold text-[#4b4b4b] leading-relaxed">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            <span>{part}</span>
            {i < blanks && (
              <span
                className={`inline-block min-w-[80px] mx-1 px-2 py-0.5 rounded-lg border-2 text-center font-mono text-sm transition-all ${
                  submitted
                    ? blankResults[i]
                      ? "border-[#58cc02] bg-[#f0fff0] text-[#58cc02]"
                      : "border-[#ff4b4b] bg-[#fff0f0] text-[#ff4b4b] line-through"
                    : activeBlank === i
                    ? "border-[#1cb0f6] bg-[#f0f9ff]"
                    : filledBlanks[i]
                    ? "border-[#1cb0f6] bg-[#f0f9ff] text-[#1cb0f6]"
                    : "border-[#e5e5e5] bg-[#f7f7f7]"
                } ${!submitted && !hasWordBank ? "cursor-text" : ""} ${
                  !submitted && hasWordBank ? "cursor-pointer" : ""
                }`}
                onClick={() => handleBlankClick(i)}
              >
                {submitted ? (
                  <span className={blankResults[i] ? "" : "flex flex-col items-center"}>
                    <span>{filledBlanks[i]}</span>
                    {!blankResults[i] && (
                      <span className="text-[#58cc02] text-xs font-normal not-line-through">
                        {answers[i]}
                      </span>
                    )}
                  </span>
                ) : hasWordBank ? (
                  filledBlanks[i] || "____"
                ) : (
                  <input
                    type="text"
                    value={filledBlanks[i] || ""}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onFocus={() => setActiveBlank(i)}
                    className="w-full bg-transparent text-center outline-none text-[#1cb0f6] font-mono text-sm"
                    placeholder="____"
                    disabled={submitted}
                  />
                )}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Hint */}
      {hint && !submitted && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <HelpCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Hint: {hint}</span>
        </div>
      )}

      {/* Word bank */}
      {hasWordBank && (
        <div className="flex flex-wrap gap-2 mt-2">
          {wordBank!.map((word, i) => {
            const isUsed = usedWords.has(word);
            return (
              <motion.button
                key={i}
                layout
                initial={{ opacity: 1, scale: 1 }}
                animate={{
                  opacity: isUsed ? 0.3 : 1,
                  scale: isUsed ? 0.9 : 1,
                }}
                onClick={() => !isUsed && handleWordBankSelect(word)}
                disabled={submitted || isUsed}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                  isUsed
                    ? "border-[#e5e5e5] bg-[#f0f0f0] text-[#afafaf] cursor-default"
                    : "border-[#1cb0f6] bg-white text-[#1cb0f6] hover:bg-[#f0f9ff] cursor-pointer"
                }`}
              >
                {word}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Submit / Skip buttons */}
      {!submitted && (
        <div className="space-y-2">
          {filledBlanks.every((b) => b !== null && b !== "") && (
            <button
              onClick={handleSubmit}
              className="w-full rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-bold py-3 px-4 text-sm transition-colors shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]"
            >
              CHECK
            </button>
          )}
          <button
            onClick={handleSkip}
            className="w-full rounded-xl bg-[#e5e5e5] hover:bg-[#d4d4d4] text-[#4b4b4b] font-bold py-3 px-4 text-sm transition-colors"
          >
            SKIP
          </button>
        </div>
      )}

      {/* Feedback */}
      {submitted && explanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 ${
            blankResults.every((r) => r)
              ? "bg-[#f0fff0] border border-[#58cc02]/30"
              : "bg-[#fff0f0] border border-[#ff4b4b]/30"
          }`}
        >
          <p className="text-sm font-semibold mb-1">
            {blankResults.every((r) => r)
              ? "✅ Correct!"
              : blankResults.some((r) => r)
              ? "🟡 Partially correct."
              : "❌ Not quite."}
          </p>
          <p className="text-sm text-[#4b4b4b]/80">{explanation}</p>
        </motion.div>
      )}
    </div>
  );
}
