import { describe, it, expect } from "vitest";
import { getBoss } from "@/data";
import { makeDefaultInput } from "./defaults";
import { formMembers, groupDisplayName, isSecondaryForm, collapseForms } from "./forms";

describe("cosmog shared-candy group (Solgaleo + Lunala)", () => {
  const solgaleo = getBoss("solgaleo")!;
  const lunala = getBoss("lunala")!;

  it("groups Solgaleo (primary) and Lunala under one shared-resource target", () => {
    expect(solgaleo.formGroup).toBe("cosmog");
    expect(lunala.formGroup).toBe("cosmog");
    expect(formMembers("cosmog").map((b) => b.id)).toEqual(["solgaleo", "lunala"]);
    expect(isSecondaryForm(solgaleo)).toBe(false);
    expect(isSecondaryForm(lunala)).toBe(true);
  });

  it("names the combined card after BOTH distinct species, not just the primary", () => {
    expect(groupDisplayName(solgaleo)).toBe("Solgaleo & Lunala");
    // A same-species forme group still reads as the plain species.
    expect(groupDisplayName(getBoss("giratina-altered")!)).toBe("Giratina");
  });

  it("collapses to the primary so the shared Cosmog pool isn't double-counted", () => {
    // Selecting Lunala (secondary) still yields exactly one effective target —
    // the primary Solgaleo — that carries the shared Candy/XL pool.
    const inputs = [
      { ...makeDefaultInput(solgaleo), selected: false },
      { ...makeDefaultInput(lunala), selected: true },
    ];
    const collapsed = collapseForms(inputs);
    expect(collapsed.map((i) => i.bossId)).toEqual(["solgaleo"]);
    expect(collapsed[0].selected).toBe(true); // any forme selected → group selected
  });
});
