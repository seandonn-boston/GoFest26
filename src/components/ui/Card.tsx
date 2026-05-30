import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gofest-panel/80 shadow-lg shadow-black/30 ${className}`}
    >
      {children}
    </div>
  );
}
