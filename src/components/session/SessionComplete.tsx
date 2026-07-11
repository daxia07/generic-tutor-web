"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Zap, Trophy, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import type { SessionResult } from "@/lib/types";

interface SessionCompleteProps {
  result: SessionResult;
  onContinue: () => void;
  nextSessionTitle?: string;
}

export function SessionComplete({ result, onContinue, nextSessionTitle }: SessionCompleteProps) {
  const confettiRef = useRef(false);

  useEffect(() => {
    if (confettiRef.current) return;
    confettiRef.current = true;

    import("canvas-confetti").then((module) => {
      const confetti = module.default || module;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#58cc02", "#ffc800", "#1cb0f6", "#ff9600"],
      });

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#58cc02", "#ffc800"],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#58cc02", "#ffc800"],
        });
      }, 300);
    });
  }, []);

  const isPerfect = result.accuracy === 100;

  return (
    <div className="text-center space-y-6 py-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
          isPerfect ? "bg-[#ffc800]" : "bg-[#58cc02]"
        }`}
      >
        <Trophy className={`w-10 h-10 ${isPerfect ? "text-white" : "text-white"}`} />
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-[#4b4b4b]">
          {isPerfect ? "Perfect!" : "Session Complete!"}
        </h2>
        {isPerfect && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[#ffc800] font-bold mt-1"
          >
            🌟 100% Accuracy 🌟
          </motion.p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
        <div className="bg-[#fff8f0] rounded-xl p-3">
          <Zap className="w-5 h-5 text-[#ff9600] mx-auto mb-1" />
          <motion.p
            className="text-xl font-bold text-[#ff9600]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            +{result.xpEarned}
          </motion.p>
          <p className="text-xs text-[#4b4b4b]/60">XP</p>
        </div>

        <div className="bg-[#f0f9ff] rounded-xl p-3">
          <CheckCircle2 className="w-5 h-5 text-[#1cb0f6] mx-auto mb-1" />
          <p className="text-xl font-bold text-[#1cb0f6]">{result.accuracy}%</p>
          <p className="text-xs text-[#4b4b4b]/60">Accuracy</p>
        </div>

        <div className="bg-[#fff0f0] rounded-xl p-3">
          <CheckCircle2 className="w-5 h-5 text-[#58cc02] mx-auto mb-1" />
          <p className="text-xl font-bold text-[#58cc02]">{result.correctCount}/{result.totalQuestions}</p>
          <p className="text-xs text-[#4b4b4b]/60">Correct</p>
        </div>
      </div>

      {result.conceptsUpdated.length > 0 && (
        <div className="text-left max-w-sm mx-auto space-y-1">
          <p className="text-xs font-medium text-[#4b4b4b]/70 uppercase tracking-wide">
            Concepts covered:
          </p>
          {result.conceptsUpdated.map((c) => (
            <div key={c.conceptId} className="flex items-center gap-2 text-sm">
              {c.newStatus === "mastered" ? (
                <Trophy className="w-3.5 h-3.5 text-[#ffc800]" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#58cc02]" />
              )}
              <span className="capitalize">{c.conceptId.replace(/-/g, " ")}</span>
              <span className="text-xs text-muted-foreground ml-auto capitalize">
                {c.newStatus}
              </span>
            </div>
          ))}
        </div>
      )}

      {result.mistakes.length > 0 && (
        <div className="text-left max-w-sm mx-auto space-y-1">
          <p className="text-xs font-medium text-[#ff4b4b]/70 uppercase tracking-wide">
            Mistakes to review:
          </p>
          {result.mistakes.map((m, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <AlertCircle className="w-3.5 h-3.5 text-[#ff4b4b] mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{m.stem || m.questionId}</span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2">
        {nextSessionTitle && (
          <p className="text-xs text-muted-foreground mb-3">
            Next up: {nextSessionTitle}
          </p>
        )}
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-bold py-3 px-8 text-base transition-colors shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]"
        >
          Continue Learning
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
