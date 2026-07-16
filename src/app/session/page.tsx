"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  SessionMetadata,
  SessionState,
  Question,
  AnswerRecord,
  SessionResult,
  MultipleChoiceQuestion,
  ScenarioQuestion,
} from "@/lib/types";
import { gradeFromCorrectness } from "@/lib/sm2";
import { SessionIntro } from "@/components/session/SessionIntro";
import { SessionComplete } from "@/components/session/SessionComplete";
import { PipAvatar, PipBubble } from "@/components/Pip";

type OptionQ = MultipleChoiceQuestion | ScenarioQuestion;

function isOptionQ(q: Question): q is OptionQ {
  return q.type === "multiple-choice" || q.type === "scenario";
}

function SessionFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessionMeta, setSessionMeta] = useState<SessionMetadata | null>(null);
  const [state, setState] = useState<SessionState>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const answersRef = useRef<AnswerRecord[]>([]);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [hearts, setHearts] = useState(5);

  useEffect(() => {
    const mode = searchParams.get("mode") || "learn";
    const conceptId = searchParams.get("conceptId") || undefined;
    const params = new URLSearchParams({ mode });
    if (conceptId) params.set("conceptId", conceptId);

    fetch(`/api/session?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setSessionMeta(data);
      })
      .catch(() => setError("Failed to load session"))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const questions = (sessionMeta?.questions || []).filter(isOptionQ);
  const currentQuestion = questions[currentIndex] ?? null;
  const totalQuestions = questions.length;

  const handleCheck = useCallback(() => {
    if (!currentQuestion || !selected || submitted) return;
    const isCorrect = selected === currentQuestion.correctAnswer;
    setSubmitted(true);
    setLastCorrect(isCorrect);
    if (!isCorrect) setHearts((h) => Math.max(0, h - 1));

    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      conceptId: currentQuestion.conceptId,
      isReview: currentQuestion.isReview ?? false,
      correct: isCorrect,
      userAnswer: selected,
      correctAnswer: currentQuestion.correctAnswer,
      sm2Grade: gradeFromCorrectness(isCorrect, false),
    };
    setAnswers((prev) => {
      const next = [...prev, record];
      answersRef.current = next;
      return next;
    });
  }, [currentQuestion, selected, submitted]);

  const handleContinue = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalQuestions) {
      if (!sessionMeta) return;
      setState("complete");
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionMeta.sessionId,
          answers: answersRef.current,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setResult(data);
        })
        .catch(console.error);
    } else {
      setCurrentIndex(nextIndex);
      setSelected(null);
      setSubmitted(false);
      setLastCorrect(false);
    }
  }, [currentIndex, totalQuestions, sessionMeta]);

  const handleStart = useCallback(() => setState("question"), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[#58cc02] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !sessionMeta) {
    return (
      <div className="text-center py-20 space-y-4 px-4">
        <p className="text-lg font-bold text-[#ff4b4b]">
          {error || "Session not found"}
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl bg-[#58cc02] text-white font-bold py-2 px-6 text-sm"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (totalQuestions === 0) {
    return (
      <div className="text-center py-20 space-y-4 px-4">
        <p className="text-lg font-bold">
          All caught up — no option questions right now.
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl bg-[#58cc02] text-white font-bold py-2 px-6 text-sm"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const progressPct = Math.round(
    ((currentIndex + (submitted ? 1 : 0)) / totalQuestions) * 100
  );

  if (state === "intro") {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <SessionIntro
          title={sessionMeta.title}
          summary={sessionMeta.summary}
          learningPoints={sessionMeta.learningPoints}
          questionCount={totalQuestions}
          estimatedMinutes={sessionMeta.estimatedMinutes}
          reviewQuestionCount={sessionMeta.reviewQuestionCount}
          onStart={handleStart}
        />
      </div>
    );
  }

  if (state === "complete") {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        {result ? (
          <SessionComplete
            result={result}
            onContinue={() => router.push("/")}
            nextSessionTitle={
              result.nextConceptTitle ||
              sessionMeta.nextConceptTitle ||
              undefined
            }
            onStartNext={
              result.nextConceptId || sessionMeta.nextConceptId
                ? () => {
                    const id =
                      result.nextConceptId || sessionMeta.nextConceptId;
                    router.push(
                      `/session?conceptId=${encodeURIComponent(id!)}&mode=learn`
                    );
                  }
                : undefined
            }
          />
        ) : (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-[#58cc02] border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground mt-4">Saving…</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-[#afafaf] font-bold text-lg w-8"
          aria-label="Close"
        >
          ✕
        </button>
        <div className="flex-1 h-3.5 bg-[#e5e5e5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#58cc02] rounded-full transition-all"
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
        <div className="text-[#ff4b4b] font-extrabold text-sm whitespace-nowrap">
          ❤️ {hearts}
        </div>
      </div>

      <div className="flex-1 px-5 pb-4 flex flex-col">
        <div className="flex gap-3 items-start mb-5">
          <PipAvatar size="md" />
          <PipBubble>
            {currentQuestion?.isReview && (
              <div className="inline-block text-[0.65rem] font-extrabold uppercase tracking-wide text-[#ff9600] bg-[#fff4e5] rounded-full px-2 py-0.5 mb-1.5">
                Review
              </div>
            )}
            <div>{currentQuestion?.stem}</div>
          </PipBubble>
        </div>

        <div className="space-y-2.5 mt-auto">
          {currentQuestion?.options.map((option) => {
            const isSelected = selected === option.id;
            const isCorrectOpt = option.id === currentQuestion.correctAnswer;
            let cls =
              "w-full text-left border-2 border-[#e5e5e5] bg-white rounded-[14px] px-4 py-3.5 font-bold text-sm shadow-[0_2px_0_#e5e5e5] flex items-center gap-3";
            if (submitted) {
              if (isCorrectOpt)
                cls =
                  "w-full text-left border-2 border-[#58cc02] bg-[#d7ffb8] rounded-[14px] px-4 py-3.5 font-bold text-sm shadow-[0_2px_0_#58cc02] flex items-center gap-3";
              else if (isSelected && !isCorrectOpt)
                cls =
                  "w-full text-left border-2 border-[#ff4b4b] bg-[#ffdfe0] rounded-[14px] px-4 py-3.5 font-bold text-sm shadow-[0_2px_0_#ff4b4b] flex items-center gap-3";
            } else if (isSelected) {
              cls =
                "w-full text-left border-2 border-[#1cb0f6] bg-[#ddf4ff] rounded-[14px] px-4 py-3.5 font-bold text-sm shadow-[0_2px_0_#84d8ff] flex items-center gap-3";
            }

            return (
              <button
                key={option.id}
                type="button"
                disabled={submitted}
                onClick={() => setSelected(option.id)}
                className={cls}
              >
                <span
                  className={`w-7 h-7 rounded-lg grid place-items-center text-xs font-extrabold flex-shrink-0 ${
                    !submitted && isSelected
                      ? "bg-[#1cb0f6] text-white"
                      : "bg-[#f0f0f0] text-[#777]"
                  }`}
                >
                  {option.id}
                </span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`px-5 pt-4 pb-8 border-t-2 ${
          submitted
            ? lastCorrect
              ? "bg-[#d7ffb8] border-[#a6e05a]"
              : "bg-[#ffdfe0] border-[#ff9e9e]"
            : "bg-white border-[#e5e5e5]"
        }`}
      >
        {submitted ? (
          <>
            <div
              className={`font-extrabold text-lg mb-1 ${
                lastCorrect ? "text-[#46a302]" : "text-[#ea2b2b]"
              }`}
            >
              {lastCorrect ? "Nice! +10 XP" : "Not quite"}
            </div>
            {currentQuestion?.explanation && (
              <p className="text-sm font-semibold text-[#3c3c3c] mb-3 leading-snug">
                {currentQuestion.explanation}
                {currentQuestion.type === "scenario" &&
                  currentQuestion.tradeOffs && (
                    <span className="block mt-1 text-[#777]">
                      Trade-offs: {currentQuestion.tradeOffs}
                    </span>
                  )}
              </p>
            )}
            <button
              type="button"
              onClick={handleContinue}
              className="w-full rounded-[14px] bg-[#58cc02] text-white font-extrabold py-3.5 uppercase tracking-wide shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]"
            >
              Continue
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!selected}
            onClick={handleCheck}
            className="w-full rounded-[14px] font-extrabold py-3.5 uppercase tracking-wide disabled:bg-[#e5e5e5] disabled:text-[#afafaf] disabled:shadow-[0_4px_0_#d0d0d0] bg-[#58cc02] text-white shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]"
          >
            Check
          </button>
        )}
      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-[#58cc02] border-t-transparent rounded-full" />
        </div>
      }
    >
      <SessionFlow />
    </Suspense>
  );
}
