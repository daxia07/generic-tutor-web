"use client";

import { BookOpen, Clock, Zap, ArrowRight } from "lucide-react";

interface SessionIntroProps {
  title: string;
  summary: string;
  learningPoints: string[];
  questionCount: number;
  estimatedMinutes: number;
  reviewQuestionCount: number;
  onStart: () => void;
}

export function SessionIntro({
  title,
  summary,
  learningPoints,
  questionCount,
  estimatedMinutes,
  reviewQuestionCount,
  onStart,
}: SessionIntroProps) {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-[#58cc02]/10 flex items-center justify-center">
        <BookOpen className="w-8 h-8 text-[#58cc02]" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#4b4b4b]">{title}</h2>
        <p className="text-muted-foreground mt-2">{summary}</p>
      </div>

      {learningPoints.length > 0 && (
        <div className="text-left max-w-sm mx-auto space-y-2">
          <p className="text-sm font-medium text-[#4b4b4b]/70 uppercase tracking-wide">
            In this session you&apos;ll learn:
          </p>
          {learningPoints.map((point, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-[#58cc02] mt-0.5">✦</span>
              <span className="text-[#4b4b4b]">{point}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Zap className="w-4 h-4" />
          <span>{questionCount} questions</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>~{estimatedMinutes} min</span>
        </div>
      </div>

      {reviewQuestionCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Includes {reviewQuestionCount} review question
          {reviewQuestionCount > 1 ? "s" : ""} from past topics
        </p>
      )}

      <button
        onClick={onStart}
        className="inline-flex items-center gap-2 rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-bold py-3 px-8 text-base transition-colors shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]"
      >
        Start Lesson
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
