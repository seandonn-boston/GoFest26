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
      className={`relative rounded-xl border-2 border-white/15 bg-gofest-panel/90 shadow-brutal backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}
