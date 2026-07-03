/**
 * The GO FEST '26 emblem — the step-1 title for the weekend (main event)
 * selection section. A one-of-a-kind medallion, deliberately unlike every other
 * type treatment in the app:
 *
 *  - The bright metallic holder is NOT a circle/box: it is the text itself
 *    dilated (feMorphology on the glyph alpha, blurred + re-thresholded into an
 *    organic blob), so the border hugs exactly how the font renders — change
 *    the font and the holder re-molds itself.
 *  - Inside it, a generous pool of the event's habitat energies — Psychic,
 *    Ghost and Electric type colors — drifts like liquid jostling to stay
 *    together, with sparkles winking across the surface (all masked to the
 *    inner silhouette).
 *  - "GO / FEST" sits embossed on two lines, vertically centered, with "26"
 *    even larger behind them (the Mewtwo X/Y treatment's calmer sibling).
 *  - No glitching: the only motion is the pool, its sparkles, and an occasional
 *    glimmer sweeping the metal band (masked to outer-minus-inner). All motion
 *    honors prefers-reduced-motion (see globals.css `.gf-*`).
 *
 * Every layer (metal, bevel light, pool mask, glint band) reuses ONE silhouette
 * group (#gf-sil), so the visible embossed text and its holder can never drift
 * apart.
 */

// The heaviest face on the page — Archivo Black, self-hosted by next/font in
// layout.tsx and exposed as --font-emblem so this component stays a pure SVG.
// The silhouette derives from the glyph alpha, so the holder molds itself to
// whatever face actually renders.
const HEAVY_FONT = "var(--font-emblem, var(--font-display))";

// The tile bezel's gold family (globals.css .badge), so the medallion reads as
// kin to the enamel badges — just bigger and brighter.
const GOLD_LIGHT = "#fff4ce";
const GOLD_MID = "#caa047";
const GOLD_DEEP = "#9c7a30";
const GOLD_SHADOW = "#6d5420";

// The weekend's headline energies (TYPE_COLORS): psychic/ghost/electric.
const PSYCHIC = "#F95587";
const GHOST = "#735797";
const ELECTRIC = "#F7D02C";

// Silhouette geometry: the pool reaches ~POOL units beyond the glyphs before
// the metal band (~BAND units thick) takes over — a wide moat, not a snug edge.
// (Dialed to read as ~72px of water around the type at full render size.)
const POOL_RADIUS = 29;
const BAND = 16;
const SMOOTH = 12; // blur that rounds the dilation organic

/** Organic silhouette: dilate the glyph alpha, blur it, then re-threshold —
 *  the blur+threshold rounds the dilation into a single liquid-metal blob. */
function BlobFilter({ id, radius, white }: { id: string; radius: number; white?: boolean }) {
  return (
    <filter id={id} filterUnits="userSpaceOnUse" x="-110" y="-110" width="740" height="560">
      <feMorphology in="SourceAlpha" operator="dilate" radius={radius} result="d" />
      <feGaussianBlur in="d" stdDeviation={SMOOTH} result="b" />
      <feComponentTransfer in="b" result="t">
        <feFuncA type="linear" slope="18" intercept="-6" />
      </feComponentTransfer>
      {white ? (
        <>
          <feFlood floodColor="#fff" result="w" />
          <feComposite in="w" in2="t" operator="in" />
        </>
      ) : null}
    </filter>
  );
}

// Sparkles: (x, y, radius, delay s, duration s) — scattered across the pool.
const SPARKS: Array<[number, number, number, number, number]> = [
  [120, 90, 2.4, 0, 2.9],
  [205, 62, 1.8, -1.1, 3.6],
  [318, 84, 2.6, -2.3, 3.1],
  [420, 120, 1.9, -0.6, 2.6],
  [455, 210, 2.3, -1.8, 3.4],
  [372, 262, 1.7, -2.9, 2.8],
  [258, 288, 2.5, -0.3, 3.2],
  [148, 268, 1.8, -1.5, 2.7],
  [78, 196, 2.2, -2.6, 3.5],
  [186, 168, 1.6, -0.9, 2.5],
  [340, 178, 2.0, -2.0, 3.0],
  [92, 128, 1.5, -1.3, 2.4],
];

const DRIFT = "gf-blob";

export function GoFestEmblem() {
  return (
    <h2 className="mx-auto mb-1 mt-6 w-full max-w-[520px]">
      <span className="sr-only">GO Fest ’26 — the main event. Pick your weekend targets.</span>
      <svg viewBox="0 0 520 340" aria-hidden="true" className="gf-emblem block w-full select-none">
        <defs>
          {/* ---- the typography, defined ONCE (masks + visible copies all reuse it) ---- */}
          <g id="gf-year">
            <text x="260" y="178" textAnchor="middle" dominantBaseline="central" fontSize="230" letterSpacing="-6">
              26
            </text>
          </g>
          <g id="gf-words">
            <text x="260" y="126" textAnchor="middle" dominantBaseline="central" fontSize="84" letterSpacing="8">
              GO
            </text>
            <text x="260" y="214" textAnchor="middle" dominantBaseline="central" fontSize="84" letterSpacing="4">
              FEST
            </text>
          </g>
          <g id="gf-sil">
            <use href="#gf-year" />
            <use href="#gf-words" />
          </g>

          {/* ---- silhouette filters: outer holder, inner pool, and the band between ---- */}
          <BlobFilter id="gf-blob-outer" radius={POOL_RADIUS + BAND} white />
          <BlobFilter id="gf-blob-inner" radius={POOL_RADIUS} white />
          <filter id="gf-blob-ring" filterUnits="userSpaceOnUse" x="-110" y="-110" width="740" height="560">
            <feMorphology in="SourceAlpha" operator="dilate" radius={POOL_RADIUS + BAND} result="do" />
            <feGaussianBlur in="do" stdDeviation={SMOOTH} result="bo" />
            <feComponentTransfer in="bo" result="outer">
              <feFuncA type="linear" slope="18" intercept="-6" />
            </feComponentTransfer>
            <feMorphology in="SourceAlpha" operator="dilate" radius={POOL_RADIUS} result="di" />
            <feGaussianBlur in="di" stdDeviation={SMOOTH} result="bi" />
            <feComponentTransfer in="bi" result="inner">
              <feFuncA type="linear" slope="18" intercept="-6" />
            </feComponentTransfer>
            <feComposite in="outer" in2="inner" operator="out" result="ring" />
            <feFlood floodColor="#fff" result="w" />
            <feComposite in="w" in2="ring" operator="in" />
          </filter>

          {/* Bevel light: specular over the softened outer silhouette → the raised,
              light-catching metal surface (a real object, not a flat sticker). */}
          <filter id="gf-shine" filterUnits="userSpaceOnUse" x="-110" y="-110" width="740" height="560">
            <feMorphology in="SourceAlpha" operator="dilate" radius={POOL_RADIUS + BAND} result="d" />
            <feGaussianBlur in="d" stdDeviation="8" result="b" />
            <feSpecularLighting
              in="b"
              surfaceScale="10"
              specularConstant="1"
              specularExponent="15"
              lightingColor="#fff7dd"
              result="spec"
            >
              <feDistantLight azimuth="235" elevation="52" />
            </feSpecularLighting>
            <feComposite in="spec" in2="b" operator="in" />
          </filter>

          <mask id="gf-outer-mask" maskUnits="userSpaceOnUse" x="-110" y="-110" width="740" height="560">
            <use href="#gf-sil" filter="url(#gf-blob-outer)" />
          </mask>
          <mask id="gf-pool-mask" maskUnits="userSpaceOnUse" x="-110" y="-110" width="740" height="560">
            <use href="#gf-sil" filter="url(#gf-blob-inner)" />
          </mask>
          <mask id="gf-ring-mask" maskUnits="userSpaceOnUse" x="-110" y="-110" width="740" height="560">
            <use href="#gf-sil" filter="url(#gf-blob-ring)" />
          </mask>

          {/* ---- paints ---- */}
          <linearGradient id="gf-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={GOLD_LIGHT} />
            <stop offset="0.28" stopColor={GOLD_MID} />
            <stop offset="0.55" stopColor={GOLD_LIGHT} />
            <stop offset="0.8" stopColor={GOLD_DEEP} />
            <stop offset="1" stopColor={GOLD_SHADOW} />
          </linearGradient>
          <linearGradient id="gf-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffdf6" />
            <stop offset="0.5" stopColor="#f3e9cd" />
            <stop offset="1" stopColor="#cdb578" />
          </linearGradient>
          <linearGradient id="gf-glint-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="gf-sheen" cx="0.5" cy="0.18" r="0.75">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.06" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          {[
            ["gf-c-psychic", PSYCHIC],
            ["gf-c-ghost", GHOST],
            ["gf-c-electric", ELECTRIC],
          ].map(([id, c]) => (
            <radialGradient key={id} id={id}>
              <stop offset="0" stopColor={c} stopOpacity="0.95" />
              <stop offset="0.6" stopColor={c} stopOpacity="0.5" />
              <stop offset="1" stopColor={c} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Everything below inherits the ultra-black display font — the
            silhouette IS the rendered text, so the holder always fits it. */}
        <g style={{ fontFamily: HEAVY_FONT }}>
          {/* 1 · the metal holder (text-shaped, organically rounded) */}
          <rect x="-110" y="-110" width="740" height="560" fill="url(#gf-metal)" mask="url(#gf-outer-mask)" />
          {/* 2 · bevel light across the raised metal */}
          <use href="#gf-sil" filter="url(#gf-shine)" opacity="0.85" />

          {/* 3 · the contained pool — headline energies drifting like liquid */}
          <g mask="url(#gf-pool-mask)">
            <rect x="-110" y="-110" width="740" height="560" fill="#161028" />
            <circle className={`${DRIFT} gf-blob-1`} cx="150" cy="120" r="135" fill="url(#gf-c-psychic)" />
            <circle className={`${DRIFT} gf-blob-2`} cx="370" cy="105" r="145" fill="url(#gf-c-ghost)" />
            <circle className={`${DRIFT} gf-blob-3`} cx="275" cy="250" r="130" fill="url(#gf-c-electric)" />
            <circle className={`${DRIFT} gf-blob-4`} cx="105" cy="255" r="120" fill="url(#gf-c-psychic)" />
            <circle className={`${DRIFT} gf-blob-5`} cx="440" cy="245" r="115" fill="url(#gf-c-ghost)" />
            <circle className={`${DRIFT} gf-blob-6`} cx="215" cy="85" r="100" fill="url(#gf-c-electric)" />
            {/* sparkles winking across the liquid */}
            {SPARKS.map(([x, y, r, delay, dur], i) => (
              <circle
                key={i}
                className="gf-spark"
                cx={x}
                cy={y}
                r={r}
                fill="#fff9e8"
                style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
              />
            ))}
            {/* liquid dome sheen so the pool reads as one glossy surface */}
            <rect x="-110" y="-110" width="740" height="560" fill="url(#gf-sheen)" />
          </g>

          {/* 4 · "26" — even larger, behind the wordmark (the X/Y treatment's kin) */}
          <g>
            <use href="#gf-year" fill="rgba(5,6,12,0.5)" transform="translate(0 3)" />
            <use href="#gf-year" fill="rgba(244,238,255,0.26)" />
          </g>

          {/* 5 · GO / FEST — embossed: top-lit highlight, under-shadow, gilded face */}
          <use href="#gf-words" fill="rgba(5,6,12,0.65)" transform="translate(0 3.5)" />
          <use href="#gf-words" fill="rgba(255,255,250,0.9)" transform="translate(0 -2.5)" />
          <use href="#gf-words" fill="url(#gf-face)" />

          {/* 6 · the occasional glimmer racing along the metal band only */}
          <g mask="url(#gf-ring-mask)">
            <g transform="rotate(22 260 170)">
              <rect className="gf-glint" x="-240" y="-200" width="100" height="740" fill="url(#gf-glint-grad)" />
            </g>
          </g>
        </g>
      </svg>
    </h2>
  );
}
