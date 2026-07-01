import { describe, expect, it } from "vitest";
import { tileTitle, tileTitleForSource } from "./tileTitle";

describe("tileTitle", () => {
  const t = (id: string, name: string) => tileTitle({ id, name });

  it("drops the leading 'Mega' for megas", () => {
    expect(t("mega-abomasnow", "Mega Abomasnow")).toBe("Abomasnow");
    expect(t("mega-tyranitar", "Mega Tyranitar")).toBe("Tyranitar");
  });

  it("keeps 'Mega' for the Mewtwo headliners", () => {
    expect(t("mega-mewtwo-x", "Mega Mewtwo X")).toBe("Mega Mewtwo X");
    expect(t("mega-mewtwo-y", "Mega Mewtwo Y")).toBe("Mega Mewtwo Y");
  });

  it("abbreviates 'Origin Forme X' to 'X O'", () => {
    expect(t("dialga-origin", "Origin Forme Dialga")).toBe("Dialga O");
    expect(t("palkia-origin", "Origin Forme Palkia")).toBe("Palkia O");
  });

  it("abbreviates single parenthetical Formes", () => {
    expect(t("giratina-altered", "Giratina (Altered)")).toBe("Giratina A");
    expect(t("giratina-origin", "Giratina (Origin)")).toBe("Giratina O");
    expect(t("tornadus-incarnate", "Tornadus (Incarnate)")).toBe("Tornadus I");
    expect(t("landorus-therian", "Landorus (Therian)")).toBe("Landorus T");
  });

  it("abbreviates combined Formes with a slash", () => {
    expect(t("genie", "Genie (Incarnate & Therian)")).toBe("Genie I/T");
  });

  it("drops the '(all …)' qualifier", () => {
    expect(t("deoxys", "Deoxys (all Formes)")).toBe("Deoxys");
    expect(t("genesect", "Genesect (all Drive Formes)")).toBe("Genesect");
  });

  it("abbreviates 'Hero of Many Battles' to H", () => {
    expect(t("zacian", "Zacian (Hero of Many Battles)")).toBe("Zacian H");
    expect(t("zamazenta", "Zamazenta (Hero of Many Battles)")).toBe("Zamazenta H");
  });

  it("leaves plain names untouched", () => {
    expect(t("dialga", "Dialga")).toBe("Dialga");
    expect(t("reshiram", "Reshiram")).toBe("Reshiram");
  });
});

describe("tileTitleForSource", () => {
  it("abbreviates a single-word forme prefix to its first letter", () => {
    expect(tileTitleForSource("Primal Kyogre")).toBe("P Kyogre");
    expect(tileTitleForSource("Primal Groudon")).toBe("P Groudon");
    expect(tileTitleForSource("White Kyurem")).toBe("W Kyurem");
    expect(tileTitleForSource("Black Kyurem")).toBe("B Kyurem");
  });

  it("keeps a single initial where the base species makes it unambiguous", () => {
    expect(tileTitleForSource("Crowned Sword Zacian")).toBe("C Zacian");
    expect(tileTitleForSource("Crowned Shield Zamazenta")).toBe("C Zamazenta");
  });

  it("disambiguates colliding Necrozma formes with two initials", () => {
    // "Dawn Wings" and "Dusk Mane" would both collapse to "D Necrozma".
    expect(tileTitleForSource("Dawn Wings Necrozma")).toBe("DW Necrozma");
    expect(tileTitleForSource("Dusk Mane Necrozma")).toBe("DM Necrozma");
  });
});
