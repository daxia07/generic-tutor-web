"use client";

import { motion } from "framer-motion";
import { Heart, ArrowRight, AlertCircle } from "lucide-react";

interface SessionGameOverProps {
  mistakes: { questionId: string; stem: string; userAnswer: string; correctAnswer: string }[];
  onRetry: () => void;
  onGoHome: () => void;
}

export function SessionGameOver({
  mistakes,
  onRetry,
  onGoHome,
}: SessionGameOverProps) {
  return (
    <div className="text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-20 h-20 mx-auto rounded-full bg-[#ff4b4b]/10 flex items-center justify-center"
      >
        <Heart className="w-10 h-10 text-[#ff4b4b]" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-[#4b4b4b]">
          Out of Hearts!
        </h2>
        <p className="text-muted-foreground mt-2">
          Don&apos;t worry — review your mistakes and try again.
        </p>
      </div>

      {mistakes.length > 0 && (
        <div className="text-left max-w-sm mx-auto space-y-2">
          <p className="text-xs font-medium text-[#ff4b4b]/70 uppercase tracking-wide">
            Mistakes to review:
          </p>
          {mistakes.map((m, i) => (
            <div
              key={i}
              className="bg-[#fff0f0] rounded-lg p-3 border border-[#ff4b4b]/20"
            >
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-3.5 h-3.5 text-[#ff4b4b] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  {m.stem && (
                    <p className="font-medium text-[#4b4b4b]">{m.stem}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your answer: <span className="text-[#ff4b4b]">{m.userAnswer}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Correct: <span className="text-[#58cc02]">{m.correctAnswer}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 max-w-xs mx-auto">
        <button
          onClick={onRetry}
          className="rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-bold py-3 px-6 text-sm transition-colors shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]"
        >
          Retry Session
        </button>
        <button
          onClick={onGoHome}
          className="rounded-xl border-2 border-[#e5e5e5] text-[#4b4b4b] font-bold py-3 px-6 text-sm transition-colors hover:bg-[#f0f0f0]"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
