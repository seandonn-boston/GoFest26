// The app's icon mark: a Mega Mewtwo sprite (X or Y) on the brand backdrop, used
// by the favicon, the iOS/Android home-screen icons, the PWA install icon and the
// social card. Rendered by Satori (next/og ImageResponse) at build time, so the
// sprite is read from disk and inlined as a data URI (no build-time network).

import { readFileSync } from "node:fs";
import { join } from "node:path";

function spriteDataUri(file: string): string {
  const buf = readFileSync(join(process.cwd(), "public/brand", file));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

// Read once at module load (each icon route imports this).
const MEWTWO: Record<"x" | "y", string> = {
  x: spriteDataUri("mewtwo-x.png"),
  y: spriteDataUri("mewtwo-y.png"),
};

const BACKDROP = "radial-gradient(120% 120% at 30% 0%, #2a1248 0%, #0b0712 60%, #050507 100%)";

/** Mega Mewtwo (X or Y) on the brand backdrop, sized to `px`. The favicon/app-icon
 *  surfaces alternate between the two forms. `radius` rounds an embedded tile. */
export function MewtwoMark({ px, form, radius = 0 }: { px: number; form: "x" | "y"; radius?: number }) {
  const sprite = Math.round(px * 0.84);
  return (
    <div
      style={{
        width: px,
        height: px,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BACKDROP,
        borderRadius: radius,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MEWTWO[form]} width={sprite} height={sprite} alt={`Mega Mewtwo ${form.toUpperCase()}`} />
    </div>
  );
}
