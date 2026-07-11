"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { Question } from "@/lib/types";

interface ScenarioProps {
  question: Question;
  onAnswer: (answer: string, isCorrect: boolean) => void;
}

export function Scenario({
  question,
  onAnswer,
}: ScenarioProps) {
  if (question.type !== "scenario") return null;

  const { stem, options, correctAnswer, explanation, tradeOffs } = question;
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSelect(optionId: string) {
    if (submitted) return;
    setSelected(optionId);
  }

  function handleSubmit() {
    if (!selected || submitted) return;
    const isCorrect = selected === correctAnswer;
    setSubmitted(true);
    onAnswer(selected, isCorrect);
  }

  function handleSkip() {
    if (submitted) return;
    setSelected(correctAnswer);
    setSubmitted(true);
    onAnswer(correctAnswer, false);
  }

  return (
    <div className="space-y-4">
      {question.isReview && (
        <div className="inline-flex items-center gap-1 text-xs font-medium text-[#ff9600] bg-[#fff0e0] rounded-full px-2.5 py-0.5">
          🔄 Review
        </div>
      )}

      <div className="inline-flex items-center gap-1 text-xs font-medium text-[#1cb0f6] bg-[#e8f4fd] rounded-full px-2.5 py-0.5 mb-1">
        💡 Scenario
      </div>

      <h3 className="text-lg font-semibold text-[#4b4b4b]">{stem}</h3>

      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selected === option.id;
          const isCorrectOption = option.id === correctAnswer;
          let borderColor = "border-[#e5e5e5]";
          let bgColor = "bg-white";

          if (submitted) {
            if (isCorrectOption) {
              borderColor = "border-[#58cc02]";
              bgColor = "bg-[#f0fff0]";
            } else if (isSelected && !isCorrectOption) {
              borderColor = "border-[#ff4b4b]";
              bgColor = "bg-[#fff0f0]";
            }
          } else if (isSelected) {
            borderColor = "border-[#1cb0f6]";
            bgColor = "bg-[#f0f9ff]";
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={submitted}
              className={`w-full text-left rounded-xl p-3.5 border-2 transition-all ${borderColor} ${bgColor} ${
                !submitted ? "hover:border-[#1cb0f6] hover:bg-[#f0f9ff] cursor-pointer" : "cursor-default"
              } ${submitted && isCorrectOption ? "ring-2 ring-[#58cc02]/30" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#f7f7f7] flex items-center justify-center text-sm font-bold text-[#4b4b4b] flex-shrink-0">
                  {option.id}
                </span>
                <span className="text-sm font-medium text-[#4b4b4b]">{option.text}</span>
                {submitted && isCorrectOption && (
                  <CheckCircle2 className="w-5 h-5 text-[#58cc02] ml-auto flex-shrink-0" />
                )}
                {submitted && isSelected && !isCorrectOption && (
                  <XCircle className="w-5 h-5 text-[#ff4b4b] ml-auto flex-shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!submitted && (
        <div className="space-y-2">
          {selected && (
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
            selected === correctAnswer
              ? "bg-[#f0fff0] border border-[#58cc02]/30"
              : "bg-[#fff0f0] border border-[#ff4b4b]/30"
          }`}
        >
          <p className="text-sm font-semibold mb-1">
            {selected === correctAnswer ? "✅ Correct!" : "❌ Not quite."}
          </p>
          <p className="text-sm text-[#4b4b4b]/80">{explanation}</p>
        </motion.div>
      )}

      {submitted && tradeOffs && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl p-4 bg-[#fffbeb] border border-[#f59e0b]/30"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#f59e0b] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#92400e] mb-1">Trade-off to consider</p>
              <p className="text-sm text-[#92400e]/80">{tradeOffs}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
