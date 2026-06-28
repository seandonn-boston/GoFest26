import { energyChip, type ScanResult } from "@/lib/screenshotScan";
import { formatNumber } from "@/lib/format";

// Chip themes: Candy/XL keep the original green, Mega/Primal energy is purple,
// Fusion/Crowned energy is blue, evolution items are yellow.
type Tone = "candy" | "mega" | "fusion" | "item";
const TONE_CLASS: Record<Tone, string> = {
  candy: "text-emerald-200 ring-white/10",
  mega: "text-purple-300 ring-purple-400/40",
  fusion: "text-sky-300 ring-sky-400/40",
  item: "text-amber-300 ring-amber-400/40",
};

function chips(scan: ScanResult): { text: string; tone: Tone }[] {
  const out: { text: string; tone: Tone }[] = [];
  if (scan.candy !== undefined) out.push({ text: `Candy ${formatNumber(scan.candy)}`, tone: "candy" });
  if (scan.xlCandy !== undefined) out.push({ text: `XL ${formatNumber(scan.xlCandy)}`, tone: "candy" });
  for (const e of scan.megaEnergies) {
    out.push({ text: energyChip(e), tone: e.kind === "fusion" || e.kind === "crowned" ? "fusion" : "mega" });
  }
  for (const i of scan.items) out.push({ text: `${i.name} ${formatNumber(i.value)}`, tone: "item" });
  return out;
}

/** The color-coded value pills for one scanned screenshot. */
export function ScanChips({ scan }: { scan: ScanResult }) {
  return (
    <div className="flex flex-wrap gap-1">
      {chips(scan).map((c, i) => (
        <span
          key={`${i}-${c.text}`}
          className={`rounded-full bg-black/40 px-2 py-0.5 font-mono text-[13px] ring-1 ${TONE_CLASS[c.tone]}`}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}
