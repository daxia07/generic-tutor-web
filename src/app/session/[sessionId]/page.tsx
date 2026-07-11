"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type {
  SessionMetadata,
  SessionState,
  Question,
  AnswerRecord,
  SessionResult,
} from "@/lib/types";
import { gradeFromCorrectness } from "@/lib/sm2";
import { ProgressBar } from "@/components/session/ProgressBar";
import { SessionIntro } from "@/components/session/SessionIntro";
import { SessionComplete } from "@/components/session/SessionComplete";
import { MultipleChoice } from "@/components/questions/MultipleChoice";
import { FillInBlank } from "@/components/questions/FillInBlank";
import { SelectAll } from "@/components/questions/SelectAll";
import { OrderArrange } from "@/components/questions/OrderArrange";
import { Scenario } from "@/components/questions/Scenario";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
  const router = useRouter();

  const [sessionMeta, setSessionMeta] = useState<SessionMetadata | null>(null);
  const [state, setState] = useState<SessionState>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readyForNext, setReadyForNext] = useState(false);

  // Fetch session data
  useEffect(() => {
    fetch("/api/session?mode=learn")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSessionMeta(data);
        }
      })
      .catch(() => setError("Failed to load session"))
      .finally(() => setLoading(false));
  }, []);

  const currentQuestion: Question | null =
    sessionMeta && currentIndex < sessionMeta.questions.length
      ? sessionMeta.questions[currentIndex]
      : null;

  const totalQuestions = sessionMeta?.questionCount ?? 0;

  // Build an answer record from question + answer data
  function buildAnswerRecord(
    question: Question,
    userAnswerStr: string,
    isCorrect: boolean,
    isPartial: boolean = false
  ): AnswerRecord {
    const sm2Grade = gradeFromCorrectness(isCorrect, isPartial);
    let correctAnswerStr: string;

    switch (question.type) {
      case "multiple-choice":
        correctAnswerStr = question.correctAnswer;
        break;
      case "fill-in-blank":
        correctAnswerStr = JSON.stringify(question.answers);
        break;
      case "select-all":
        correctAnswerStr = JSON.stringify(question.correctAnswers);
        break;
      case "order":
        correctAnswerStr = JSON.stringify(question.correctOrder);
        break;
      case "scenario":
        correctAnswerStr = question.correctAnswer;
        break;
      default:
        correctAnswerStr = "";
    }

    return {
      questionId: question.id,
      conceptId: question.conceptId,
      isReview: question.isReview ?? false,
      correct: isCorrect,
      userAnswer: userAnswerStr,
      correctAnswer: correctAnswerStr,
      sm2Grade,
    };
  }

  // Handle answer from MultipleChoice
  const handleMCAnswer = useCallback(
    (userAnswer: string, isCorrect: boolean) => {
      if (!currentQuestion) return;
      const record = buildAnswerRecord(currentQuestion, userAnswer, isCorrect);
      processAnswer(record);
    },
    [currentQuestion]
  );

  // Handle answer from FillInBlank
  const handleFIBAnswer = useCallback(
    (userAnswer: string[], isCorrect: boolean) => {
      if (!currentQuestion) return;
      const record = buildAnswerRecord(
        currentQuestion,
        JSON.stringify(userAnswer),
        isCorrect
      );
      processAnswer(record);
    },
    [currentQuestion]
  );

  // Handle answer from SelectAll
  const handleSelectAllAnswer = useCallback(
    (selectedIds: string[], isCorrect: boolean, isPartial: boolean) => {
      if (!currentQuestion) return;
      const record = buildAnswerRecord(
        currentQuestion,
        JSON.stringify(selectedIds),
        isCorrect,
        isPartial
      );
      processAnswer(record);
    },
    [currentQuestion]
  );

  // Handle answer from OrderArrange
  const handleOrderAnswer = useCallback(
    (orderedItems: string[], isCorrect: boolean, isPartial: boolean) => {
      if (!currentQuestion) return;
      const record = buildAnswerRecord(
        currentQuestion,
        JSON.stringify(orderedItems),
        isCorrect,
        isPartial
      );
      processAnswer(record);
    },
    [currentQuestion]
  );

  // Core answer processing logic
  function processAnswer(record: AnswerRecord) {
    setAnswers((prev) => [...prev, record]);

    // Show feedback then enable continue
    setReadyForNext(false);
    setTimeout(() => {
      setReadyForNext(true);
    }, 1200);
  }

  // Proceed to next question or complete
  const handleContinue = useCallback(() => {
    if (!sessionMeta) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalQuestions) {
      // Session complete — POST results
      setState("complete");
      const finalAnswers = answers;
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionMeta.sessionId,
          answers: finalAnswers,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) {
            setResult(data);
          }
        })
        .catch(console.error);
    } else {
      setCurrentIndex(nextIndex);
      setReadyForNext(false);
    }
  }, [sessionMeta, currentIndex, totalQuestions, answers]);

  const handleStart = useCallback(() => {
    setState("question");
  }, []);

  const handleContinueLearning = useCallback(() => {
    router.push("/");
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[#58cc02] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !sessionMeta) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-lg font-medium text-[#ff4b4b]">
          {error || "Session not found"}
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-bold py-2 px-6 text-sm"
        >
          Back to Home
        </button>
      </div>
    );
  }

  // Empty session (no questions)
  if (totalQuestions === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-lg font-medium text-[#4b4b4b]">
          All caught up! No new questions right now.
        </p>
        <p className="text-sm text-muted-foreground">
          Come back later when more concepts are due for review.
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-bold py-2 px-6 text-sm"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header: progress bar (shown during questions) */}
      {state === "question" && (
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar current={currentIndex + 1} total={totalQuestions} />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {state === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <SessionIntro
              title={sessionMeta.title}
              summary={sessionMeta.summary}
              learningPoints={sessionMeta.learningPoints}
              questionCount={sessionMeta.questionCount}
              estimatedMinutes={sessionMeta.estimatedMinutes}
              reviewQuestionCount={sessionMeta.reviewQuestionCount}
              onStart={handleStart}
            />
          </motion.div>
        )}

        {state === "question" && currentQuestion && (
          <motion.div
            key={`question-${currentIndex}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
          >
            {currentQuestion.type === "multiple-choice" && (
              <MultipleChoice
                question={currentQuestion}
                onAnswer={handleMCAnswer}
              />
            )}

            {currentQuestion.type === "fill-in-blank" && (
              <FillInBlank
                question={currentQuestion}
                onAnswer={handleFIBAnswer}
              />
            )}

            {currentQuestion.type === "select-all" && (
              <SelectAll
                question={currentQuestion}
                onAnswer={handleSelectAllAnswer}
              />
            )}

            {currentQuestion.type === "order" && (
              <OrderArrange
                question={currentQuestion}
                onAnswer={handleOrderAnswer}
              />
            )}

            {currentQuestion.type === "scenario" && (
              <Scenario
                question={currentQuestion}
                onAnswer={handleMCAnswer}
              />
            )}

            {/* Continue button after feedback */}
            {readyForNext && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <button
                  onClick={handleContinue}
                  className="w-full rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-bold py-3 px-4 text-sm transition-colors shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px]"
                >
                  CONTINUE
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {state === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {result ? (
              <SessionComplete
                result={result}
                onContinue={handleContinueLearning}
              />
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-[#58cc02] border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground mt-4">
                  Saving your results...
                </p>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
