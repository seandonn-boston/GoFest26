/** Stylized Mega Evolution emblem, embossed behind Mega sprites in the picker. */
export function MegaGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <path d="M32 3 L61 32 L32 61 L3 32 Z" stroke="currentColor" strokeWidth="2.5" opacity="0.45" />
      <path
        d="M16 41 C16 23 32 41 32 23 C32 41 48 23 48 41"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}
