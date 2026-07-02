import { describe, expect, it } from "vitest";
import { getBoss } from "@/data";
import { remoteWindowsForBoss } from "./remoteWindows";

// The whole feature is timezone arithmetic, so the expected instants are
// hand-computed: host-local clock time T in a zone O minutes east of UTC is
// the UTC instant T − O.

describe("remoteWindowsForBoss", () => {
  it("returns null for a boss that isn't region-locked", () => {
    expect(remoteWindowsForBoss(getBoss("zekrom")!)).toBeNull();
  });

  it("maps Xurkitree's Sunday habitat block out of Asia-Pacific local time", () => {
    // Xurkitree (APAC): Verdant Anomaly, Sunday 1–4 PM host-local (Jul 12).
    const windows = remoteWindowsForBoss(getBoss("xurkitree")!)!;
    const habitat = windows.find((w) => w.hostLabel.includes("Verdant"))!;
    // Anchor Tokyo (+9): 1 PM JST = 04:00 UTC; 4 PM JST = 07:00 UTC.
    expect(habitat.anchorCity).toBe("Tokyo");
    expect(habitat.anchorStartUtc).toBe(Date.UTC(2026, 6, 12, 4, 0));
    expect(habitat.anchorEndUtc).toBe(Date.UTC(2026, 6, 12, 7, 0));
    // Wide span: opens in NZ (+12) at 01:00 UTC, closes in Pakistan (+5) at 11:00 UTC.
    expect(habitat.startUtc).toBe(Date.UTC(2026, 6, 12, 1, 0));
    expect(habitat.endUtc).toBe(Date.UTC(2026, 6, 12, 11, 0));
    expect(habitat.hostLabel).toBe("Sun 1 PM–4 PM · Verdant Anomaly");
  });

  it("includes Monday's marathon Raid Hour for a region-locked 5★ (full roster day)", () => {
    const windows = remoteWindowsForBoss(getBoss("xurkitree")!)!;
    const monday = windows.find((w) => w.hostLabel.includes("Raid Hour"))!;
    // Monday 6–8 PM host-local (marathon, megaHours 0). Tokyo: 09:00–11:00 UTC Jul 6.
    expect(monday.hostLabel).toBe("Mon 6 PM–8 PM · Raid Hour (Jul 6)");
    expect(monday.anchorStartUtc).toBe(Date.UTC(2026, 6, 6, 9, 0));
    expect(monday.anchorEndUtc).toBe(Date.UTC(2026, 6, 6, 11, 0));
    // Windows come back chronological: Monday's raid hour before Sunday's habitat.
    expect(windows[0]).toBe(monday);
  });

  it("uses the hemisphere clock for hemisphere-locked bosses", () => {
    // Kartana is Northern-Hemisphere-locked → Berlin (+2) anchor.
    const windows = remoteWindowsForBoss(getBoss("kartana")!)!;
    expect(windows.every((w) => w.anchorCity === "Berlin")).toBe(true);
    expect(windows.every((w) => w.regionLabel === "Northern Hemisphere")).toBe(true);
    // Its Sunday 1–4 PM block in Berlin (CEST +2) = 11:00–14:00 UTC.
    const habitat = windows.find((w) => !w.hostLabel.includes("Raid Hour"))!;
    expect(habitat.anchorStartUtc).toBe(Date.UTC(2026, 6, 12, 11, 0));
    expect(habitat.anchorEndUtc).toBe(Date.UTC(2026, 6, 12, 14, 0));
  });
});
