/**
 * The GO FEST '26 emblem — the step-1 title for the weekend (main event).
 *
 * PERFORMANCE FIRST. An earlier version rendered a text-shaped holder with SVG
 * filters (feMorphology + feSpecularLighting). Those are murderously slow to
 * rasterize on mobile GPUs — even static, they made the whole page crawl. This
 * version uses ZERO SVG filters, masks, or backdrop-filters: it is plain HTML +
 * CSS gradients, so it paints instantly and the motion is pure GPU transform.
 *
 * A gold conic bezel (kin to the enamel tile badges) rings a dark well; inside,
 * two layers of type-color gradient blobs (Psychic / Ghost / Electric) churn on
 * long, mismatched cycles so the pool keeps rearranging without an obvious loop,
 * with a faint twinkle of sparkles. "GO / FEST" sits embossed via layered
 * text-shadow over a big translucent glass "26". All motion is transform/opacity
 * only (compositor-cheap) and stops under prefers-reduced-motion (globals.css).
 */
export function GoFestEmblem() {
  return (
    <h2 className="mx-auto mb-1 mt-6 w-full max-w-[460px]">
      <span className="sr-only">GO Fest ’26 — the main event. Pick your weekend targets.</span>
      <div className="gf2" aria-hidden="true">
        <div className="gf2-inner">
          <div className="gf2-pool gf2-pool-a" />
          <div className="gf2-pool gf2-pool-b" />
          <div className="gf2-spark" />
          <div className="gf2-sheen" />
          <div className="gf2-year">26</div>
          <div className="gf2-words">
            <span>GO</span>
            <span>FEST</span>
          </div>
        </div>
      </div>
    </h2>
  );
}
