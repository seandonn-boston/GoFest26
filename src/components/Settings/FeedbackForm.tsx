"use client";

import { useState } from "react";

// The public repo issues feed. GitHub URLs are case-insensitive.
const REPO = "seandonn-boston/GoFest26";

const TYPES = [
  { id: "bug", label: "Bug", emoji: "🐞" },
  { id: "idea", label: "Idea", emoji: "✨" },
  { id: "data", label: "Data fix", emoji: "📊" },
  { id: "other", label: "Other", emoji: "💬" },
];

/**
 * Feedback → GitHub Issues. With no backend, the most direct pipeline is a
 * pre-filled `issues/new` URL the user reviews and submits on GitHub.
 */
export function FeedbackForm({ onDone }: { onDone?: () => void }) {
  const [type, setType] = useState("idea");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");

  const active = TYPES.find((t) => t.id === type)!;
  const canSubmit = summary.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    const title = `[${active.label}] ${summary.trim()}`;
    const body = [
      details.trim(),
      "",
      "---",
      `Type: ${active.label}`,
      typeof window !== "undefined" ? `Page: ${window.location.href}` : "",
      "Submitted via the GO Fest 2026 Raid Planner.",
    ]
      .filter(Boolean)
      .join("\n");
    const url = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(
      title,
    )}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onDone?.();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Found a bug, have an idea, or spotted wrong data? This opens a pre-filled GitHub issue you can
        review and submit (needs a free GitHub account).
      </p>

      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={`rounded-sm border px-2.5 py-1.5 text-sm transition ${
              type === t.id
                ? "border-gofest-accent2 bg-gofest-accent2/15 text-white"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Summary</span>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={120}
          placeholder="One line — what's the gist?"
          className="w-full rounded-sm border border-white/10 bg-gofest-bg/60 px-3 py-2 text-base text-slate-100 outline-none focus:border-gofest-accent2"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">
          Details <span className="text-slate-500">(optional)</span>
        </span>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={5}
          placeholder="Steps to reproduce, what you expected, the Pokémon/number that's off, etc."
          className="w-full resize-y rounded-sm border border-white/10 bg-gofest-bg/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-gofest-accent2"
        />
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full rounded-sm border-2 border-black/40 bg-gofest-acid px-4 py-2.5 font-mono text-sm font-extrabold uppercase tracking-wider text-black shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        Open GitHub issue →
      </button>
    </div>
  );
}
