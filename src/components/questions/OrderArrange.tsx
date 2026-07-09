"use client";

import React, { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { CheckCircle2, XCircle, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import type { Question } from "@/lib/types";

interface OrderArrangeProps {
  question: Question;
  onAnswer: (orderedItems: string[], isCorrect: boolean, isPartial: boolean) => void;
  disabled?: boolean;
}

export function OrderArrange({
  question,
  onAnswer,
  disabled = false,
}: OrderArrangeProps) {
  if (question.type !== "order") return null;

  const { stem, items, correctOrder, explanation } = question;

  // Shuffle items on mount (but keep stable via useState initializer)
  const [orderedItems, setOrderedItems] = useState<string[]>(() => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });

  const [submitted, setSubmitted] = useState(false);
  const [itemResults, setItemResults] = useState<boolean[]>([]);

  function moveItem(index: number, direction: "up" | "down") {
    if (submitted) return;
    const newItems = [...orderedItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setOrderedItems(newItems);
  }

  function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);

    // Check each position against correctOrder (correctOrder has indices into the original items array)
    const results = orderedItems.map((item, i) => {
      const correctItemIndex = correctOrder[i];
      return items[correctItemIndex] === item;
    });

    setItemResults(results);

    const isCorrect = results.every((r) => r);
    // Off-by-1 check: if at most 1 item is in wrong position, it's partial
    const wrongCount = results.filter((r) => !r).length;
    const isPartial = !isCorrect && wrongCount <= 2;

    onAnswer(orderedItems, isCorrect, isPartial);
  }

  return (
    <div className="space-y-4">
      {question.isReview && (
        <div className="inline-flex items-center gap-1 text-xs font-medium text-[#ff9600] bg-[#fff0e0] rounded-full px-2.5 py-0.5">
          🔄 Review
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-[#4b4b4b]">{stem}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Arrange in the correct order
        </p>
      </div>

      <div className="space-y-1.5">
        {orderedItems.map((item, index) => {
          let borderColor = "border-[#e5e5e5]";
          let bgColor = "bg-white";

          if (submitted) {
            if (itemResults[index]) {
              borderColor = "border-[#58cc02]";
              bgColor = "bg-[#f0fff0]";
            } else {
              borderColor = "border-[#ff4b4b]";
              bgColor = "bg-[#fff0f0]";
            }
          }

          return (
            <div
              key={item}
              className={`flex items-center gap-2 rounded-xl p-3 border-2 ${borderColor} ${bgColor} ${
                !submitted ? "hover:border-[#1cb0f6] hover:bg-[#f0f9ff]" : ""
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-[#f7f7f7] flex items-center justify-center text-xs font-bold text-[#4b4b4b] flex-shrink-0">
                {index + 1}
              </span>

              <span className="flex-1 text-sm font-medium text-[#4b4b4b]">
                {item}
              </span>

              {submitted && (
                <span className="flex-shrink-0">
                  {itemResults[index] ? (
                    <CheckCircle2 className="w-5 h-5 text-[#58cc02]" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#ff4b4b]" />
                  )}
                </span>
              )}

              {!submitted && (
                <div className="flex flex-col flex-shrink-0">
                  <button
                    onClick={() => moveItem(index, "up")}
                    disabled={index === 0}
                    className="p-0.5 text-[#afafaf] hover:text-[#1cb0f6] disabled:opacity-30 disabled:cursor-default cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveItem(index, "down")}
                    disabled={index === orderedItems.length - 1}
                    className="p-0.5 text-[#afafaf] hover:text-[#1cb0f6] disabled:opacity-30 disabled:cursor-default cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          className="w-full rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-bold py-3 px-4 text-sm transition-colors shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]"
        >
          CHECK
        </button>
      )}

      {submitted && explanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 ${
            itemResults.every((r) => r)
              ? "bg-[#f0fff0] border border-[#58cc02]/30"
              : "bg-[#fff0f0] border border-[#ff4b4b]/30"
          }`}
        >
          <p className="text-sm font-semibold mb-1">
            {itemResults.every((r) => r) ? "✅ Correct!" : "❌ Not quite."}
          </p>
          <p className="text-sm text-[#4b4b4b]/80">{explanation}</p>
          {!itemResults.every((r) => r) && (
            <div className="mt-2 pt-2 border-t border-[#e5e5e5]">
              <p className="text-xs text-muted-foreground mb-1">Correct order:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                {correctOrder.map((idx, i) => (
                  <li key={i} className="text-sm text-[#4b4b4b]">
                    {items[idx]}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
