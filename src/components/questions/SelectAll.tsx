"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { Question } from "@/lib/types";

interface SelectAllProps {
  question: Question;
  onAnswer: (selectedIds: string[], isCorrect: boolean, isPartial: boolean) => void;
}

export function SelectAll({
  question,
  onAnswer,
}: SelectAllProps) {
  if (question.type !== "select-all") return null;

  const { stem, options, correctAnswers, explanation } = question;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  function toggleOption(optionId: string) {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  }

  function handleSubmit() {
    if (submitted || selected.size === 0) return;
    setSubmitted(true);

    const selectedArr = Array.from(selected);
    const correctSet = new Set(correctAnswers);

    const allCorrectSelected = correctAnswers.every((id) => selected.has(id));
    const noIncorrectSelected = selectedArr.every((id) => correctSet.has(id));
    const isCorrect = allCorrectSelected && noIncorrectSelected;
    const isPartial = allCorrectSelected && !noIncorrectSelected;

    onAnswer(selectedArr, isCorrect, isPartial);
  }

  function handleSkip() {
    if (submitted) return;
    setSelected(new Set(correctAnswers));
    setSubmitted(true);
    onAnswer([], false, false);
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
          Select all that apply
        </p>
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selected.has(option.id);
          const isCorrectOption = correctAnswers.includes(option.id);

          let borderColor = "border-[#e5e5e5]";
          let bgColor = "bg-white";
          let iconEl: React.ReactNode = null;

          if (submitted) {
            if (isCorrectOption && isSelected) {
              borderColor = "border-[#58cc02]";
              bgColor = "bg-[#f0fff0]";
              iconEl = <CheckCircle2 className="w-5 h-5 text-[#58cc02]" />;
            } else if (isCorrectOption && !isSelected) {
              // Missed correct — show yellow
              borderColor = "border-[#ffc800]";
              bgColor = "bg-[#fff9e6]";
              iconEl = <AlertCircle className="w-5 h-5 text-[#ffc800]" />;
            } else if (!isCorrectOption && isSelected) {
              borderColor = "border-[#ff4b4b]";
              bgColor = "bg-[#fff0f0]";
              iconEl = <XCircle className="w-5 h-5 text-[#ff4b4b]" />;
            }
          } else if (isSelected) {
            borderColor = "border-[#1cb0f6]";
            bgColor = "bg-[#f0f9ff]";
          }

          return (
            <button
              key={option.id}
              onClick={() => toggleOption(option.id)}
              disabled={submitted}
              className={`w-full text-left rounded-xl p-3.5 border-2 transition-all ${borderColor} ${bgColor} ${
                !submitted
                  ? "hover:border-[#1cb0f6] hover:bg-[#f0f9ff] cursor-pointer"
                  : "cursor-default"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    submitted && isCorrectOption && isSelected
                      ? "border-[#58cc02] bg-[#58cc02]"
                      : submitted && !isCorrectOption && isSelected
                      ? "border-[#ff4b4b] bg-[#ff4b4b]"
                      : isSelected
                      ? "border-[#1cb0f6] bg-[#1cb0f6]"
                      : "border-[#e5e5e5]"
                  }`}
                >
                  {(isSelected || (submitted && isCorrectOption)) && (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="text-sm font-medium text-[#4b4b4b] flex-1">
                  {option.text}
                </span>
                {iconEl && (
                  <span className="flex-shrink-0">{iconEl}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!submitted && (
        <div className="space-y-2">
          {selected.size > 0 && (
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

      {submitted && explanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 ${
            selected.size === correctAnswers.length &&
            Array.from(selected).every((id) => correctAnswers.includes(id)) &&
            correctAnswers.every((id) => selected.has(id))
              ? "bg-[#f0fff0] border border-[#58cc02]/30"
              : "bg-[#fff0f0] border border-[#ff4b4b]/30"
          }`}
        >
          <p className="text-sm font-semibold mb-1">
            {selected.size === correctAnswers.length &&
            Array.from(selected).every((id) => correctAnswers.includes(id)) &&
            correctAnswers.every((id) => selected.has(id))
              ? "✅ Correct!"
              : "❌ Not quite."}
          </p>
          <p className="text-sm text-[#4b4b4b]/80">{explanation}</p>
        </motion.div>
      )}
    </div>
  );
}
