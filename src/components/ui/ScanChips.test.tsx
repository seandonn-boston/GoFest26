// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScanChips } from "./ScanChips";
import type { ScanResult } from "@/lib/screenshotScan";

const scan = (over: Partial<ScanResult>): ScanResult => ({
  species: null,
  detectedName: null,
  megaEnergies: [],
  items: [],
  looksLikePogo: true,
  capturedAt: 0,
  readAnything: true,
  ...over,
});

describe("<ScanChips>", () => {
  it("renders candy and XL pills from a scan", () => {
    render(<ScanChips scan={scan({ candy: 1234, xlCandy: 56 })} />);
    expect(screen.getByText("Candy 1,234")).toBeInTheDocument();
    expect(screen.getByText("XL 56")).toBeInTheDocument();
  });

  it("themes mega energy purple and fusion energy blue", () => {
    render(
      <ScanChips
        scan={scan({
          megaEnergies: [
            { value: 200, species: "charizard", kind: "mega", form: "x" },
            { value: 90, species: "kyogre", kind: "fusion" },
          ],
        })}
      />,
    );
    const mega = screen.getByText(/Charizard X En 200/);
    const fusion = screen.getByText(/Kyogre En 90/);
    expect(mega.className).toContain("text-purple-300");
    expect(fusion.className).toContain("text-sky-300");
  });

  it("marks an inferred energy value with ~ and lists evolution items", () => {
    render(
      <ScanChips
        scan={scan({
          megaEnergies: [{ value: 100, species: null, kind: "mega", inferred: true }],
          items: [{ name: "Sinnoh Stone", value: 45 }],
        })}
      />,
    );
    expect(screen.getByText("Energy ~100")).toBeInTheDocument();
    expect(screen.getByText("Sinnoh Stone 45")).toBeInTheDocument();
  });

  it("renders no pills for an empty scan", () => {
    const { container } = render(<ScanChips scan={scan({})} />);
    expect(container.querySelectorAll("span")).toHaveLength(0);
  });
});
