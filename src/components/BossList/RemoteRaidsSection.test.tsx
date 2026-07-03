// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { RemoteRaidsSection } from "./RemoteRaidsSection";
import { BossList } from "./BossList";

beforeEach(() => {
  usePlannerStore.getState().resetAll();
});

const expand = () => fireEvent.click(screen.getByRole("button", { name: /Remote raids/ }));

describe("<RemoteRaidsSection>", () => {
  it("starts collapsed and expands on tap", () => {
    render(<RemoteRaidsSection />);
    expect(screen.getByRole("button", { name: /Remote raids/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTitle(/Xurkitree/)).not.toBeInTheDocument();
    expand();
    expect(screen.getByTitle(/^Xurkitree — remote raid only/)).toBeInTheDocument();
  });

  it("lists exactly the bosses that are remote-only for the region, with their windows", () => {
    // Default region is Boston (N / W / americas): Pheromosa (EMEA), Xurkitree
    // (APAC), Celesteela (S) and Stakataka (E) are remote; Buzzwole, Kartana and
    // Blacephalon are local and must NOT appear here.
    render(<RemoteRaidsSection />);
    expand();
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

  it("includes the lake trio members whose home region is elsewhere (region-locked)", () => {
    // Boston: Uxie (APAC) and Mesprit (EMEA) are region-locked elsewhere → remote-
    // only here; Azelf is the Americas member and is local (stays out of remote).
    render(<RemoteRaidsSection />);
    expand();
    expect(screen.getByTitle(/^Uxie — remote raid only/)).toBeInTheDocument();
    expect(screen.getByTitle(/^Mesprit — remote raid only/)).toBeInTheDocument();
    expect(screen.queryByTitle(/Azelf/)).not.toBeInTheDocument();
    // Their windows run on the home region's clock (APAC Saturday habitat).
    expect(screen.getAllByText(/Their Sat 1 PM–4 PM/).length).toBeGreaterThan(0);
  });

  it("moving the region flips which bosses are remote", () => {
    usePlannerStore.getState().setSettings({ region: { label: "Tokyo (Japan)", ns: "N", ew: "E", continent: "apac" } });
    render(<RemoteRaidsSection />);
    expand();
    expect(screen.getByTitle(/^Buzzwole — remote raid only/)).toBeInTheDocument();
    expect(screen.queryByTitle(/Xurkitree/)).not.toBeInTheDocument(); // local in APAC
    expect(screen.getByTitle(/^Azelf — remote raid only/)).toBeInTheDocument(); // region-locked to the Americas
    expect(screen.queryByTitle("Uxie")).not.toBeInTheDocument(); // home member (local in APAC)
  });
});

describe("<BossList> remote tile placement", () => {
  it("keeps remote-only tiles out of the habitat sections (they live in the remote section only)", () => {
    render(<BossList />);
    fireEvent.click(screen.getByRole("button", { name: /Remote raids/ }));
    // Remote for Boston → rendered once, inside the remote section.
    expect(screen.getAllByTitle(/^Xurkitree — remote raid only/)).toHaveLength(1);
    // Local UB → rendered once, inside its habitat section (no remote badge).
    expect(screen.getAllByTitle("Buzzwole")).toHaveLength(1);
    // A region-locked lake trio member (Uxie = APAC) is remote-only for Boston →
    // one tile, in the remote section only.
    expect(screen.getAllByTitle(/^Uxie — remote raid only/)).toHaveLength(1);
  });
});
