/**
 * The GO FEST '26 emblem — the step-1 title for the weekend (main event)
 * selection section. A one-of-a-kind medallion, deliberately unlike every other
 * type treatment in the app:
 *
 *  - The bright metallic holder is NOT a circle/box: it is the text itself
 *    dilated (feMorphology on the glyph alpha, blurred + re-thresholded into an
 *    organic blob), so the border hugs exactly how the font renders — change
 *    the font and the holder re-molds itself.
 *  - Inside it, a pool of the event's headline energies — Psychic, Ghost and
 *    Electric type colors — with sparkles glinting off the surface.
 *  - "GO / FEST" sits on two lines as a domed meniscus of liquid metal (a
 *    specular-lit bevel — like water filled above the brim), with "26" even
 *    larger behind them (the Mewtwo X/Y treatment's calmer sibling).
 *
 * PERFORMANCE: the whole thing is STATIC and rendered once. It carries heavy
 * one-time SVG filters (morphology holder, specular meniscus), so it must never
 * repaint per-frame — there are deliberately no CSS animations here, and
 * `.gf-emblem` is promoted to its own compositor layer (globals.css) so
 * scrolling composites a cached bitmap instead of re-rasterizing the filters.
 * Every layer reuses ONE silhouette group (#gf-sil), so the embossed text and
 * its holder can never drift apart.
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
// the metal band (~BAND units thick) takes over. Tuned so the moat reads as
// ~50px of water and the gold band ~5px thicker than before.
const POOL_RADIUS = 20;
const BAND = 23;
const SMOOTH = 12; // blur that rounds the dilation organic

// Filter/mask region, kept tight to the actual art (viewBox is 520×340). A
// small margin covers the dilated + blurred holder. Big regions multiply every
// filter's cost, so this is deliberately not the old 740×560.
const RX = -40;
const RY = -50;
const RW = 600;
const RH = 440;

/** Organic silhouette: dilate the glyph alpha, blur it, then re-threshold —
 *  the blur+threshold rounds the dilation into a single liquid-metal blob. */
function BlobFilter({ id, radius, white }: { id: string; radius: number; white?: boolean }) {
  return (
    <filter id={id} filterUnits="userSpaceOnUse" x={RX} y={RY} width={RW} height={RH}>
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

// Static sparkles glinting off the pool: (x, y, radius, opacity).
const SPARKS: Array<[number, number, number, number]> = [
  [120, 90, 2.4, 0.9],
  [205, 62, 1.7, 0.7],
  [318, 84, 2.6, 1],
  [420, 120, 1.8, 0.75],
  [455, 210, 2.2, 0.85],
  [372, 262, 1.6, 0.7],
  [258, 288, 2.4, 0.95],
  [148, 268, 1.7, 0.7],
  [78, 196, 2.1, 0.8],
  [186, 168, 1.5, 0.6],
  [340, 178, 2.0, 0.85],
  [92, 128, 1.5, 0.6],
];

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

          {/* ---- silhouette filters: outer holder + inner pool ---- */}
          <BlobFilter id="gf-blob-outer" radius={POOL_RADIUS + BAND} white />
          <BlobFilter id="gf-blob-inner" radius={POOL_RADIUS} white />

          {/* Bevel light: specular over the softened outer silhouette → the raised,
              light-catching metal band. One-time render (the emblem is static). */}
          <filter id="gf-shine" filterUnits="userSpaceOnUse" x={RX} y={RY} width={RW} height={RH}>
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

          {/* Meniscus emboss for the wordmark: blur the glyph alpha into a rounded
              height map, then ride a bright SPECULAR highlight over the crown — the
              wet dome of water filled above the brim. The gilded face (SourceGraphic,
              top-light → bottom-dark) is the body beneath. One specular pass only,
              kept cheap; the emblem never repaints, so this cost is paid once. */}
          <filter id="gf-emboss" filterUnits="userSpaceOnUse" x="0" y="0" width="520" height="340">
            <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="hmap" />
            <feSpecularLighting
              in="hmap"
              surfaceScale="9"
              specularConstant="1.3"
              specularExponent="24"
              lightingColor="#fffdf2"
              result="spec"
            >
              <feDistantLight azimuth="235" elevation="60" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specClip" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="specClip" />
            </feMerge>
          </filter>

          {/* A real, blurred drop shadow for the wordmark — cast off the pool. */}
          <filter id="gf-drop" filterUnits="userSpaceOnUse" x="0" y="0" width="520" height="340">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="b" />
            <feOffset in="b" dx="0" dy="5" result="o" />
            <feComponentTransfer in="o">
              <feFuncA type="linear" slope="0.6" />
            </feComponentTransfer>
          </filter>

          <mask id="gf-outer-mask" maskUnits="userSpaceOnUse" x={RX} y={RY} width={RW} height={RH}>
            <use href="#gf-sil" filter="url(#gf-blob-outer)" />
          </mask>
          <mask id="gf-pool-mask" maskUnits="userSpaceOnUse" x={RX} y={RY} width={RW} height={RH}>
            <use href="#gf-sil" filter="url(#gf-blob-inner)" />
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
          {/* Frosted-glass fill for "26" — the card UI's liquid-glass sheen
              (135° translucent whites) applied to the numeral so the pool tints
              through it like frosted glass. Kept translucent on purpose. */}
          <linearGradient id="gf-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
            <stop offset="0.46" stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.3" />
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
          <rect x={RX} y={RY} width={RW} height={RH} fill="url(#gf-metal)" mask="url(#gf-outer-mask)" />
          {/* 2 · bevel light across the raised metal */}
          <use href="#gf-sil" filter="url(#gf-shine)" opacity="0.85" />

          {/* 3 · the contained pool — headline energies + surface sparkles */}
          <g mask="url(#gf-pool-mask)">
            <rect x={RX} y={RY} width={RW} height={RH} fill="#161028" />
            <circle cx="150" cy="120" r="150" fill="url(#gf-c-psychic)" />
            <circle cx="380" cy="105" r="160" fill="url(#gf-c-ghost)" />
            <circle cx="270" cy="255" r="150" fill="url(#gf-c-electric)" />
            <circle cx="100" cy="255" r="130" fill="url(#gf-c-psychic)" />
            <circle cx="450" cy="250" r="130" fill="url(#gf-c-ghost)" />
            <circle cx="215" cy="80" r="110" fill="url(#gf-c-electric)" />
            {SPARKS.map(([x, y, r, o], i) => (
              <circle key={i} cx={x} cy={y} r={r} fill="#fff9e8" opacity={o} />
            ))}
            {/* liquid dome sheen so the pool reads as one glossy surface */}
            <rect x={RX} y={RY} width={RW} height={RH} fill="url(#gf-sheen)" />
          </g>

          {/* 4 · "26" — even larger, behind the wordmark. Frosted glass, echoing
              the card UI: a blurred shadow lifts it (3D), the liquid-glass fill
              lets the pool tint through, the emboss filter domes it, and a bright
              hairline rim reads as the glass edge (the card's 1px border). */}
          <g>
            <use href="#gf-year" filter="url(#gf-drop)" />
            <use href="#gf-year" fill="url(#gf-glass)" filter="url(#gf-emboss)" />
            <use href="#gf-year" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          </g>

          {/* 5 · GO / FEST — a domed meniscus of liquid metal. A blurred drop shadow
              casts it off the pool; the gilded face runs through the emboss filter
              that rounds and lights it like water bulging over the brim. */}
          <use href="#gf-words" filter="url(#gf-drop)" />
          <use href="#gf-words" fill="url(#gf-face)" filter="url(#gf-emboss)" />
        </g>
      </svg>
    </h2>
  );
}
