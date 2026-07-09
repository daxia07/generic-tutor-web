"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  BookOpen,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Concept, ReviewCard } from "@/lib/types";

interface PageProps {
  params: Promise<{ conceptId: string }>;
}

export default function LearnConceptPage({ params }: PageProps) {
  const { conceptId } = use(params);
  const router = useRouter();

  const [concept, setConcept] = useState<Concept | null>(null);
  const [card, setCard] = useState<ReviewCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"learn" | "grade">("learn");

  useEffect(() => {
    fetch(`/api/concept/${conceptId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setConcept(data.concept);
          setCard(data.card);
        }
      })
      .catch(() => setError("Failed to load concept"))
      .finally(() => setLoading(false));
  }, [conceptId]);

  async function submitGrade(g: number) {
    setGrade(g);
    setSubmitted(true);

    try {
      const res = await fetch("/api/grade-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptId,
          grade: g,
          title: concept?.title ?? conceptId,
          difficulty: concept?.difficulty ?? 3,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setXpEarned(data.xpEarned);
        setCard(data.card);
      }
    } catch {
      setError("Failed to record grade");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[#58cc02] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !concept) {
    return (
      <div className="text-center py-20 space-y-4">
        <AlertTriangle className="w-12 h-12 mx-auto text-[#ff4b4b]" />
        <p className="text-lg font-medium">{error || "Concept not found"}</p>
        <Button variant="outline" onClick={() => router.push("/learn")}>
          Back to Learn
        </Button>
      </div>
    );
  }

  const isMastered = card && card.ef >= 2.5 && card.interval >= 21;
  const previouslyReviewed = card && card.reps > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/learn")}
          className="flex items-center gap-1 text-sm text-[#1cb0f6] hover:underline font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          {previouslyReviewed && (
            <Badge variant="outline" className="text-xs">
              {card.reps} reps · {card.interval}d int
            </Badge>
          )}
          <Badge
            className={
              isMastered
                ? "bg-[#ffc800]"
                : previouslyReviewed
                ? "bg-[#1cb0f6]"
                : "bg-[#58cc02]"
            }
          >
            {isMastered
              ? "Mastered"
              : previouslyReviewed
              ? "Learning"
              : "New"}
          </Badge>
        </div>
      </div>

      {/* Concept content card */}
      <Card className="border-[#e5e5e5] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#58cc02]" />
            {concept.title}
          </CardTitle>
          {concept.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {concept.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Definition */}
          {concept.summary && (
            <div>
              <h3 className="text-sm font-semibold text-[#4b4b4b] uppercase tracking-wide mb-1">
                Definition
              </h3>
              <p className="text-sm leading-relaxed">{concept.summary}</p>
            </div>
          )}

          <Separator />

          {/* Key Terms */}
          {Object.keys(concept.keyTerms).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#4b4b4b] uppercase tracking-wide mb-2">
                Key Terms
              </h3>
              <div className="space-y-2">
                {Object.entries(concept.keyTerms).map(([term, def]) => (
                  <div
                    key={term}
                    className="bg-[#f7f7f7] rounded-lg p-3 border border-[#e5e5e5]"
                  >
                    <p className="text-sm font-semibold">{term}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {def}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Why It Matters */}
          {concept.whyItMatters && (
            <div className="bg-[#fff9e6] rounded-lg p-4 border border-[#ffe5a0]">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-[#ffc800]" />
                <h3 className="text-sm font-semibold text-[#4b4b4b]">
                  Why It Matters
                </h3>
              </div>
              <p className="text-sm">{concept.whyItMatters}</p>
            </div>
          )}

          <Separator />

          {/* Interview Questions */}
          {concept.interviewQuestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-4 h-4 text-[#1cb0f6]" />
                <h3 className="text-sm font-semibold text-[#4b4b4b] uppercase tracking-wide">
                  Interview Questions
                </h3>
              </div>
              <div className="space-y-2">
                {concept.interviewQuestions.map((q, i) => (
                  <div
                    key={i}
                    className="bg-[#f0f9ff] rounded-lg p-3 border border-[#ccebff]"
                  >
                    <p className="text-sm">
                      <span className="font-medium text-[#1cb0f6]">
                        Q{i + 1}.
                      </span>{" "}
                      {q}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Gotchas */}
          {concept.gotchas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[#ff4b4b]" />
                <h3 className="text-sm font-semibold text-[#4b4b4b] uppercase tracking-wide">
                  Watch Out
                </h3>
              </div>
              <div className="space-y-1.5">
                {concept.gotchas.map((g, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-[#ff4b4b] mt-0.5">⚠</span>
                    <span className="text-muted-foreground">{g}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grading section */}
      {!submitted ? (
        <Card className="border-[#e5e5e5]">
          <CardContent className="p-6">
            {step === "learn" ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Read through the concept above. When you&apos;re ready, test
                  your recall.
                </p>
                <Button
                  onClick={() => setStep("grade")}
                  className="bg-[#58cc02] hover:bg-[#46a302] text-white font-bold shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px] px-8"
                >
                  I&apos;m Ready
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="font-semibold text-[#4b4b4b]">
                    How well did you know this?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Rate your recall honestly — this drives spaced repetition.
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { grade: 0, label: "Blank", color: "bg-[#e5e5e5] hover:bg-[#d4d4d4] text-[#4b4b4b]" },
                    { grade: 1, label: "Familiar", color: "bg-[#ffdfd4] hover:bg-[#ffd0c0] text-[#c44]" },
                    { grade: 2, label: "Knew bit", color: "bg-[#ffe5cc] hover:bg-[#ffd4a8] text-[#c73]" },
                    { grade: 3, label: "Hard", color: "bg-[#fff5cc] hover:bg-[#ffeaa0] text-[#a85]" },
                    { grade: 4, label: "Easy", color: "bg-[#d4f5cc] hover:bg-[#b8e8a8] text-[#5a5]" },
                    { grade: 5, label: "Perfect", color: "bg-[#58cc02] hover:bg-[#46a302] text-white" },
                  ].map(({ grade: g, label, color }) => (
                    <button
                      key={g}
                      onClick={() => submitGrade(g)}
                      className={`${color} rounded-xl py-3 px-2 text-center font-bold transition-all hover:scale-105 active:scale-95 shadow-sm`}
                    >
                      <div className="text-lg">{g}</div>
                      <div className="text-[10px] opacity-80">{label}</div>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  0 = complete blackout · 3 = correct with effort · 5 = perfect
                  recall
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Result card */
        <Card className="border-[#58cc02] bg-[#f0fff0]">
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-[#58cc02]" />
            <div>
              <p className="text-xl font-bold text-[#4b4b4b]">
                {grade != null && grade >= 3 ? "Great work!" : "Keep going!"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {grade != null && grade >= 3
                  ? "This concept will come back when you need it."
                  : "This concept will come back soon for more practice."}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-[#ff9600]" />
                <span className="font-bold">+{xpEarned} XP</span>
              </div>
              {card && (
                <>
                  <div className="text-muted-foreground">·</div>
                  <div className="text-muted-foreground">
                    Next: {new Date(card.nextReview).toLocaleDateString()}
                  </div>
                  <div className="text-muted-foreground">·</div>
                  <div className="text-muted-foreground">
                    {card.interval}d interval
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => router.push("/learn")}
              >
                Back to Learn
              </Button>
              <Button
                onClick={() => router.push("/session/new")}
                className="bg-[#58cc02] hover:bg-[#46a302] text-white font-bold"
              >
                Start Session
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom padding for mobile scrolling */}
      <div className="h-8" />
    </div>
  );
}
