/**
 * The GO FEST '26 emblem — the step-1 title for the weekend (main event)
 * selection section. A one-of-a-kind medallion, deliberately unlike every other
 * type treatment in the app:
 *
 *  - The bright metallic holder is NOT a circle/box: it is the text itself
 *    dilated (feMorphology on the glyph alpha, blurred + re-thresholded into an
 *    organic blob), so the border hugs exactly how the font renders — change
 *    the font and the holder re-molds itself.
 *  - Inside it, a contained pool of the event's habitat energies — Psychic,
 *    Ghost, Electric and Ice type colors — drifts like liquid jostling to stay
 *    together (CSS-animated gradient blobs, masked to the inner silhouette).
 *  - "GO / FEST" sits embossed on two lines, vertically centered, with "26"
 *    even larger behind them (the Mewtwo X/Y treatment's calmer sibling).
 *  - No glitching: the only motion is the pool and an occasional glimmer
 *    sweeping the metal band (masked to outer-minus-inner). All animation
 *    honors prefers-reduced-motion (see globals.css `.gf-*`).
 *
 * Every layer (metal, bevel light, pool mask, glint band) reuses ONE silhouette
 * group (#gf-sil), so the visible embossed text and its holder can never drift
 * apart.
 */

// The tile bezel's gold family (globals.css .badge), so the medallion reads as
// kin to the enamel badges — just bigger and brighter.
const GOLD_LIGHT = "#fff4ce";
const GOLD_MID = "#caa047";
const GOLD_DEEP = "#9c7a30";
const GOLD_SHADOW = "#6d5420";

// The weekend's habitat energies (TYPE_COLORS): psychic/ghost/electric/ice.
const PSYCHIC = "#F95587";
const GHOST = "#735797";
const ELECTRIC = "#F7D02C";
const ICE = "#96D9D6";

/** Organic silhouette: dilate the glyph alpha, blur it, then re-threshold —
 *  the blur+threshold rounds the dilation into a single liquid-metal blob. */
function BlobFilter({ id, radius, white }: { id: string; radius: number; white?: boolean }) {
  return (
    <filter id={id} x="-30%" y="-35%" width="160%" height="170%">
      <feMorphology in="SourceAlpha" operator="dilate" radius={radius} result="d" />
      <feGaussianBlur in="d" stdDeviation="9" result="b" />
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

const DRIFT = "gf-blob";

export function GoFestEmblem() {
  return (
    <h2 className="mx-auto mb-1 mt-6 w-full max-w-[460px]">
      <span className="sr-only">GO Fest ’26 — the main event. Pick your weekend targets.</span>
      <svg viewBox="0 0 480 300" aria-hidden="true" className="gf-emblem block w-full select-none">
        <defs>
          {/* ---- the typography, defined ONCE (masks + visible copies all reuse it) ---- */}
          <g id="gf-year">
            <text x="240" y="158" textAnchor="middle" dominantBaseline="central" fontSize="232" letterSpacing="-6">
              26
            </text>
          </g>
          <g id="gf-words">
            <text x="240" y="108" textAnchor="middle" dominantBaseline="central" fontSize="86" letterSpacing="10">
              GO
            </text>
            <text x="240" y="196" textAnchor="middle" dominantBaseline="central" fontSize="86" letterSpacing="8">
              FEST
            </text>
          </g>
          <g id="gf-sil">
            <use href="#gf-year" />
            <use href="#gf-words" />
          </g>

          {/* ---- silhouette filters: outer holder, inner pool, and the band between ---- */}
          <BlobFilter id="gf-blob-outer" radius={19} white />
          <BlobFilter id="gf-blob-inner" radius={8} white />
          <filter id="gf-blob-ring" x="-30%" y="-35%" width="160%" height="170%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="19" result="do" />
            <feGaussianBlur in="do" stdDeviation="9" result="bo" />
            <feComponentTransfer in="bo" result="outer">
              <feFuncA type="linear" slope="18" intercept="-6" />
            </feComponentTransfer>
            <feMorphology in="SourceAlpha" operator="dilate" radius="8" result="di" />
            <feGaussianBlur in="di" stdDeviation="9" result="bi" />
            <feComponentTransfer in="bi" result="inner">
              <feFuncA type="linear" slope="18" intercept="-6" />
            </feComponentTransfer>
            <feComposite in="outer" in2="inner" operator="out" result="ring" />
            <feFlood floodColor="#fff" result="w" />
            <feComposite in="w" in2="ring" operator="in" />
          </filter>

          {/* Bevel light: specular over the softened outer silhouette → the raised,
              light-catching metal surface (a real object, not a flat sticker). */}
          <filter id="gf-shine" x="-30%" y="-35%" width="160%" height="170%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="19" result="d" />
            <feGaussianBlur in="d" stdDeviation="7" result="b" />
            <feSpecularLighting
              in="b"
              surfaceScale="9"
              specularConstant="1"
              specularExponent="15"
              lightingColor="#fff7dd"
              result="spec"
            >
              <feDistantLight azimuth="235" elevation="52" />
            </feSpecularLighting>
            <feComposite in="spec" in2="b" operator="in" />
          </filter>

          <mask id="gf-outer-mask" maskUnits="userSpaceOnUse" x="-80" y="-80" width="640" height="460">
            <use href="#gf-sil" filter="url(#gf-blob-outer)" />
          </mask>
          <mask id="gf-pool-mask" maskUnits="userSpaceOnUse" x="-80" y="-80" width="640" height="460">
            <use href="#gf-sil" filter="url(#gf-blob-inner)" />
          </mask>
          <mask id="gf-ring-mask" maskUnits="userSpaceOnUse" x="-80" y="-80" width="640" height="460">
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
            ["gf-c-ice", ICE],
          ].map(([id, c]) => (
            <radialGradient key={id} id={id}>
              <stop offset="0" stopColor={c} stopOpacity="0.95" />
              <stop offset="0.6" stopColor={c} stopOpacity="0.5" />
              <stop offset="1" stopColor={c} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Everything below inherits the app display font at weight 900 — the
            silhouette IS the rendered text, so the holder always fits it. */}
        <g style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}>
          {/* 1 · the metal holder (text-shaped, organically rounded) */}
          <rect x="-80" y="-80" width="640" height="460" fill="url(#gf-metal)" mask="url(#gf-outer-mask)" />
          {/* 2 · bevel light across the raised metal */}
          <use href="#gf-sil" filter="url(#gf-shine)" opacity="0.85" />

          {/* 3 · the contained pool — habitat energies drifting like liquid */}
          <g mask="url(#gf-pool-mask)">
            <rect x="-80" y="-80" width="640" height="460" fill="#14102a" />
            <circle className={`${DRIFT} gf-blob-1`} cx="140" cy="110" r="115" fill="url(#gf-c-psychic)" />
            <circle className={`${DRIFT} gf-blob-2`} cx="340" cy="95" r="125" fill="url(#gf-c-ghost)" />
            <circle className={`${DRIFT} gf-blob-3`} cx="250" cy="215" r="105" fill="url(#gf-c-electric)" />
            <circle className={`${DRIFT} gf-blob-4`} cx="110" cy="225" r="100" fill="url(#gf-c-ice)" />
            <circle className={`${DRIFT} gf-blob-5`} cx="390" cy="215" r="90" fill="url(#gf-c-ice)" />
            <circle className={`${DRIFT} gf-blob-6`} cx="240" cy="140" r="80" fill="url(#gf-c-psychic)" />
            {/* liquid dome sheen so the pool reads as one glossy surface */}
            <rect x="-80" y="-80" width="640" height="460" fill="url(#gf-sheen)" />
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
            <g transform="rotate(22 240 150)">
              <rect className="gf-glint" x="-200" y="-170" width="95" height="640" fill="url(#gf-glint-grad)" />
            </g>
          </g>
        </g>
      </svg>
    </h2>
  );
}
