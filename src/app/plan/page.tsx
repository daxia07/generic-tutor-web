"use client";

import { useEffect, useState } from "react";
import { StatsBar } from "@/components/StatsBar";
import Link from "next/link";

type PlanNode = {
  conceptId: string;
  title: string;
  kind: string;
  estimatedMinutes?: number;
};

type PlanPayload = {
  today: string;
  tomorrow: string;
  todayPlan: { nodes: PlanNode[]; notes?: string; generatedAt?: string } | null;
  tomorrowPlan: { nodes: PlanNode[]; notes?: string; generatedAt?: string } | null;
  lastRun: {
    startedAt: string;
    finishedAt: string | null;
    status: string;
    summary: Record<string, unknown>;
  } | null;
  digestCounts: Record<string, number>;
  cron: { schedule: string; command: string; note: string };
};

export default function PlanPage() {
  const [data, setData] = useState<PlanPayload | null>(null);
  const [stats, setStats] = useState({ streak: 0, xp: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/plan").then((r) => r.json()),
      fetch("/api/progress")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([plan, progress]) => {
        if (plan.error) setError(plan.error);
        else setData(plan);
        if (progress) {
          setStats({
            streak:
              progress.streak?.currentStreak ?? progress.currentStreak ?? 0,
            xp: progress.totalXp ?? 0,
          });
        }
      })
      .catch(() => setError("Failed to load plan"));
  }, []);

  const plan = data?.tomorrowPlan || data?.todayPlan;
  const nodes = plan?.nodes || [];

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="sticky top-0 z-20 bg-white border-b-2 border-[#e5e5e5] px-4">
        <StatsBar streak={stats.streak} xp={stats.xp} />
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#1a1a2e] to-[#2d2b55] text-white p-5">
          <span className="absolute right-4 top-4 text-4xl opacity-90">🌙</span>
          <h1 className="text-xl font-extrabold pr-12">Overnight brain</h1>
          <p className="text-sm font-semibold text-white/85 mt-1 max-w-[90%] leading-snug">
            While you sleep, Pip rewrites weak questions, fills gaps from your
            Digest queue, and rebuilds tomorrow&apos;s path.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border-2 border-[#e5e5e5] bg-white p-3.5">
          <span className="font-extrabold text-sm">Auto-run at 3:00 AM</span>
          <div className="w-12 h-7 rounded-full bg-[#58cc02] relative">
            <span className="absolute right-1 top-1 w-[22px] h-[22px] rounded-full bg-white" />
          </div>
        </div>

        {error && (
          <p className="text-sm font-bold text-[#ff4b4b]">{error}</p>
        )}

        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-3.5 space-y-1">
          <div className="font-extrabold text-sm">From Digest queue</div>
          <p className="text-xs font-semibold text-[#777]">
            📥 {data?.digestCounts?.queued ?? 0} queued ·{" "}
            {data?.digestCounts?.inbox ?? 0} still in inbox
          </p>
          <Link
            href="/digest"
            className="inline-block text-xs font-extrabold text-[#1cb0f6] mt-1"
          >
            Open Digest →
          </Link>
        </div>

        <div className="space-y-2">
          <h2 className="font-extrabold">Pipeline</h2>
          {[
            {
              icon: "📥",
              bg: "bg-[#ddf4ff]",
              title: "Process queued digests",
              body: "Notes + your feedback → context packs + option MC",
            },
            {
              icon: "🛠️",
              bg: "bg-[#fff4e5]",
              title: "Rewrite high-miss questions",
              body: "Clearer stems, still options-only",
            },
            {
              icon: "➕",
              bg: "bg-[#d7ffb8]",
              title: "Fill zero-engagement concepts",
              body: "Add scenario MC for untouched topics",
            },
            {
              icon: "🗺️",
              bg: "bg-[#ddf4ff]",
              title: "Tomorrow’s path",
              body: "Review + new nodes for the home path",
            },
          ].map((row) => (
            <div
              key={row.title}
              className="flex gap-3 rounded-2xl border-2 border-[#e5e5e5] bg-white p-3"
            >
              <div
                className={`w-9 h-9 rounded-xl ${row.bg} grid place-items-center text-lg flex-shrink-0`}
              >
                {row.icon}
              </div>
              <div>
                <div className="font-extrabold text-sm">{row.title}</div>
                <p className="text-xs font-semibold text-[#777] leading-snug">
                  {row.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="font-extrabold mb-2">
            Path for {data?.tomorrow || "tomorrow"}
          </h2>
          {nodes.length === 0 ? (
            <p className="text-sm font-semibold text-[#777]">
              No plan yet. Capture digests or wait for the next overnight run.
            </p>
          ) : (
            <div className="space-y-2">
              {nodes.map((n) => (
                <Link
                  key={n.conceptId}
                  href={`/session?conceptId=${encodeURIComponent(n.conceptId)}&mode=learn`}
                  className="flex items-center justify-between rounded-2xl border-2 border-[#e5e5e5] bg-white px-3 py-2.5"
                >
                  <div>
                    <div className="text-xs font-extrabold uppercase text-[#777]">
                      {n.kind}
                    </div>
                    <div className="font-extrabold text-sm">{n.title}</div>
                  </div>
                  <span className="text-xs font-bold text-[#777]">
                    ~{n.estimatedMinutes ?? 5}m
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {data?.lastRun && (
          <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-3.5 text-sm">
            <div className="font-extrabold">Last overnight</div>
            <p className="text-xs font-semibold text-[#777] mt-1">
              {data.lastRun.status} ·{" "}
              {new Date(data.lastRun.startedAt).toLocaleString()}
            </p>
            {data.lastRun.summary && (
              <pre className="mt-2 text-[0.65rem] font-mono bg-[#1e1e2e] text-[#cdd6f4] rounded-xl p-2 overflow-x-auto">
                {JSON.stringify(data.lastRun.summary, null, 2)}
              </pre>
            )}
          </div>
        )}

        <p className="text-xs font-semibold text-[#777] pb-4">
          Cron: {data?.cron?.schedule ?? "0 3 * * *"} ·{" "}
          {data?.cron?.command ?? "npm run overnight"} · data in{" "}
          <code className="text-[0.65rem]">~/workspace/generic-tutor-web</code>
        </p>
      </div>
    </div>
  );
}
