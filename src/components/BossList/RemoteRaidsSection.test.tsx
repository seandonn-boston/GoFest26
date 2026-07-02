// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { RemoteRaidsSection } from "./RemoteRaidsSection";
import { BossList } from "./BossList";

beforeEach(() => {
  usePlannerStore.getState().resetAll();
});

describe("<RemoteRaidsSection>", () => {
  it("lists exactly the bosses that are remote-only for the region, with their windows", () => {
    // Default region is Boston (N / W / americas): Pheromosa (EMEA), Xurkitree
    // (APAC), Celesteela (S) and Stakataka (E) are remote; Buzzwole, Kartana and
    // Blacephalon are local and must NOT appear here.
    render(<RemoteRaidsSection />);
    for (const remote of ["Pheromosa", "Xurkitree", "Celesteela", "Stakataka"]) {
      expect(screen.getByTitle(new RegExp(`^${remote} — remote raid only`))).toBeInTheDocument();
    }
    for (const local of ["Buzzwole", "Kartana", "Blacephalon"]) {
      expect(screen.queryByTitle(new RegExp(local))).not.toBeInTheDocument();
    }
    // Each target shows when its home region is live (host-clock labels are
    // static; the your-time conversion hydrates after mount).
    expect(screen.getAllByText(/Their Sun 1 PM–4 PM/).length).toBeGreaterThan(0);
  });

  it("moving the region flips which bosses are remote", () => {
    usePlannerStore.getState().setSettings({ region: { label: "Tokyo (Japan)", ns: "N", ew: "E", continent: "apac" } });
    render(<RemoteRaidsSection />);
    expect(screen.getByTitle(/^Buzzwole — remote raid only/)).toBeInTheDocument();
    expect(screen.queryByTitle(/Xurkitree/)).not.toBeInTheDocument(); // local in APAC
  });
});

describe("<BossList> remote tile placement", () => {
  it("keeps remote-only tiles out of the habitat sections (they live in the remote section only)", () => {
    render(<BossList />);
    // Remote for Boston → rendered once, inside the remote section.
    expect(screen.getAllByTitle(/^Xurkitree — remote raid only/)).toHaveLength(1);
    // Local UB → rendered once, inside its habitat section (no remote badge).
    expect(screen.getAllByTitle("Buzzwole")).toHaveLength(1);
  });
});
