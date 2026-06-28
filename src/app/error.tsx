"use client";

// Route-level error boundary. Next renders this in place of the page if a
// render throws (e.g. a malformed persisted plan), instead of a white screen.
// The planner's data lives in IndexedDB/localStorage and is untouched by a
// render crash, so the reassuring copy below is accurate — a reload recovers.
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced in the console for debugging; no PII, just the stack.
    console.error("Planner render error:", error);
  }, [error]);

  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="font-mono text-[12px] uppercase tracking-[0.3em] text-gofest-accent">▚ ERROR // RECOVERABLE</div>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-100">Something glitched</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        The planner hit an unexpected error while rendering.{" "}
        <span className="text-slate-300">Your saved plan is safe</span> — it&apos;s stored on this device, not in the
        page. Try again, or reload if that doesn&apos;t clear it.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-gofest-accent2 px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5"
        >
          Reload page
        </button>
      </div>
      {error.digest ? <p className="mt-6 font-mono text-[12px] text-slate-600">ref: {error.digest}</p> : null}
    </main>
  );
}
