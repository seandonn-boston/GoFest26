"use client";

import { useEffect, useState } from "react";
import { clamp } from "@/lib/math";

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
}: NumberInputProps) {
  const upper = max ?? Number.MAX_SAFE_INTEGER;
  // Local text state lets the user clear the field and type freely without it
  // snapping to 0 mid-edit. We re-sync only when `value` changes externally
  // (e.g. a preset or reset), not from our own typing.
  const [text, setText] = useState(String(value));
  useEffect(() => {
    const n = Number(text);
    if (!(text !== "" && Number.isFinite(n) && n === value)) {
      setText(String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commit(raw: string) {
    if (raw === "") return; // allow empty while editing; don't propagate yet
    const n = Number(raw);
    // Only propagate values already in range while typing — never clamp mid-edit
    // (that snaps a cleared `min: 1` field's first digit up, or caps a number you
    // haven't finished typing). Out-of-range input is clamped once, on blur.
    if (Number.isFinite(n) && n >= min && n <= upper) onChange(n);
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          className="w-full rounded-lg border border-white/10 bg-gofest-bg/60 px-3 py-2 text-base text-slate-100 outline-none focus:border-gofest-accent2"
          value={text}
          min={min}
          max={max}
          step={step}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => {
            const n = Number(text);
            if (text === "" || !Number.isFinite(n)) {
              setText(String(value));
            } else {
              const clamped = clamp(n, min, upper);
              setText(String(clamped));
              onChange(clamped);
            }
          }}
        />
        {suffix ? <span className="shrink-0 text-xs text-slate-400">{suffix}</span> : null}
      </div>
    </label>
  );
}
