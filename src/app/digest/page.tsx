"use client";

import { useCallback, useEffect, useState } from "react";
import { StatsBar } from "@/components/StatsBar";

type DigestItem = {
  id: string;
  notes: string;
  feedback: string | null;
  sourceType: string;
  signals: string[];
  status: string;
  result: Record<string, unknown> | null;
  createdAt: string;
};

const SIGNAL_OPTIONS = [
  { id: "tradeoffs", label: "Emphasize trade-offs" },
  { id: "scenarios", label: "More scenarios" },
  { id: "interview", label: "Interview framing" },
  { id: "reinforce", label: "Review / reinforce only" },
];

const SOURCES = ["notes", "article", "transcript", "debrief"] as const;

export default function DigestPage() {
  const [items, setItems] = useState<DigestItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sourceType, setSourceType] = useState<(typeof SOURCES)[number]>("notes");
  const [signals, setSignals] = useState<string[]>(["interview"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ streak: 0, xp: 0 });

  const load = useCallback(async () => {
    const [dRes, pRes] = await Promise.all([
      fetch("/api/digest"),
      fetch("/api/progress").catch(() => null),
    ]);
    if (dRes.ok) {
      const data = await dRes.json();
      setItems(data.items || []);
      setCounts(data.counts || {});
    }
    if (pRes && pRes.ok) {
      const p = await pRes.json();
      setStats({
        streak: p.streak?.currentStreak ?? p.currentStreak ?? 0,
        xp: p.totalXp ?? 0,
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSignal(id: string) {
    setSignals((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function save(queue: boolean) {
    if (!notes.trim()) {
      setError("Add some notes first");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          feedback: feedback.trim() || null,
          sourceType,
          signals,
          queue,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      setNotes("");
      setFeedback("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function queueItem(id: string) {
    await fetch("/api/digest", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "queue" }),
    });
    await load();
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="sticky top-0 z-20 bg-white border-b-2 border-[#e5e5e5] px-4">
        <StatsBar streak={stats.streak} xp={stats.xp} />
      </div>

      <div className="px-4 py-4 space-y-4">
        <div>
          <h1 className="text-xl font-extrabold">Digest inbox</h1>
          <p className="text-sm font-semibold text-[#777] mt-0.5">
            Capture notes &amp; feedback. Pip cooks them overnight into lessons.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-extrabold uppercase text-[#777]">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="Paste article, meeting notes, or interview debrief…"
            className="w-full rounded-2xl border-2 border-dashed border-[#e5e5e5] bg-white p-3 text-sm font-semibold outline-none focus:border-[#1cb0f6]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-extrabold uppercase text-[#777]">
            Your feedback (optional but gold)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder='e.g. “I keep mixing fan-out with stampede — more MC on WHEN to choose write-time.”'
            className="w-full rounded-2xl border-2 border-[#e5e5e5] bg-white p-3 text-sm font-semibold outline-none focus:border-[#1cb0f6]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSourceType(s)}
              className={`rounded-full border-2 px-3 py-1 text-xs font-extrabold capitalize ${
                sourceType === s
                  ? "border-[#1cb0f6] bg-[#ddf4ff] text-[#1899d6]"
                  : "border-[#e5e5e5] bg-white text-[#3c3c3c]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-extrabold uppercase text-[#777]">
            Signals
          </div>
          <div className="flex flex-wrap gap-2">
            {SIGNAL_OPTIONS.map((s) => {
              const on = signals.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSignal(s.id)}
                  className={`rounded-full border-2 px-3 py-1.5 text-xs font-extrabold ${
                    on
                      ? "border-[#58cc02] bg-[#d7ffb8] text-[#46a302]"
                      : "border-[#e5e5e5] bg-white"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="text-sm font-bold text-[#ff4b4b]">{error}</p>
        )}

        <div className="grid gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => save(false)}
            className="w-full rounded-2xl bg-[#e5e5e5] hover:bg-[#d4d4d4] text-[#3c3c3c] font-extrabold py-3 uppercase text-sm disabled:opacity-50"
          >
            Save to inbox
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save(true)}
            className="w-full rounded-2xl bg-[#58cc02] hover:bg-[#46a302] text-white font-extrabold py-3 uppercase text-sm shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[2px] disabled:opacity-50"
          >
            Save + queue for tonight
          </button>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-extrabold">Queue</h2>
            <span className="text-xs font-bold text-[#777]">
              inbox {counts.inbox ?? 0} · queued {counts.queued ?? 0} · done{" "}
              {counts.done ?? 0}
            </span>
          </div>
          <div className="space-y-2">
            {items.length === 0 && (
              <p className="text-sm font-semibold text-[#777] py-4 text-center">
                No captures yet. Paste something you want to remember.
              </p>
            )}
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold uppercase text-[#777]">
                      {item.sourceType} · {item.status}
                      {item.status === "queued" ? " 🌙" : ""}
                      {item.status === "done" ? " ✓" : ""}
                    </div>
                    <p className="text-sm font-bold mt-1 line-clamp-2">
                      {item.notes}
                    </p>
                    {item.feedback && (
                      <p className="text-xs font-semibold text-[#777] mt-1 line-clamp-2">
                        feedback: {item.feedback}
                      </p>
                    )}
                    {item.result && typeof item.result.conceptId === "string" && (
                      <p className="text-xs font-bold text-[#58cc02] mt-1">
                        → {String(item.result.title || item.result.conceptId)}
                      </p>
                    )}
                  </div>
                  {(item.status === "inbox" || item.status === "failed") && (
                    <button
                      type="button"
                      onClick={() => queueItem(item.id)}
                      className="text-xs font-extrabold text-[#1cb0f6] flex-shrink-0"
                    >
                      Queue
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
