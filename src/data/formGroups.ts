// Shared-resource multi-form raid species. The two formes of these species draw
// from ONE Candy / Candy XL pool, so the planner treats each group as a SINGLE
// resource target (one raids-needed total) that can be hunted across whichever
// time blocks its formes appear in — while counters / mega suggestions stay
// per-forme. The first member listed is the "primary" forme that carries the
// shared input + represents the group in the plan.
//
// Mewtwo X/Y is intentionally NOT here: its X and Y Mega Energy are separate
// pools and it already has bespoke day-locked handling.

export interface FormMember {
  /** Roster boss id. */
  id: string;
  /** Short forme label for the combined card's per-forme sections. */
  label: string;
}

export const FORM_GROUPS: Record<string, FormMember[]> = {
  giratina: [
    { id: "giratina-altered", label: "Altered" },
    { id: "giratina-origin", label: "Origin" },
  ],
  dialga: [
    { id: "dialga", label: "Standard" },
    { id: "dialga-origin", label: "Origin" },
  ],
  palkia: [
    { id: "palkia", label: "Standard" },
    { id: "palkia-origin", label: "Origin" },
  ],
  tornadus: [
    { id: "tornadus-incarnate", label: "Incarnate" },
    { id: "tornadus-therian", label: "Therian" },
  ],
  thundurus: [
    { id: "thundurus-incarnate", label: "Incarnate" },
    { id: "thundurus-therian", label: "Therian" },
  ],
  landorus: [
    { id: "landorus-incarnate", label: "Incarnate" },
    { id: "landorus-therian", label: "Therian" },
  ],
  enamorus: [
    { id: "enamorus-incarnate", label: "Incarnate" },
    { id: "enamorus-therian", label: "Therian" },
  ],
};

/** Per-boss-id form metadata, derived from FORM_GROUPS. */
export interface FormMeta {
  group: string;
  label: string;
  /** True for the group's representative forme (carries the shared resource pool). */
  primary: boolean;
  /** Sibling boss ids in the same group (excludes self). */
  siblings: string[];
}

export const FORM_META: Map<string, FormMeta> = (() => {
  const m = new Map<string, FormMeta>();
  for (const [group, members] of Object.entries(FORM_GROUPS)) {
    members.forEach((member, i) => {
      m.set(member.id, {
        group,
        label: member.label,
        primary: i === 0,
        siblings: members.filter((x) => x.id !== member.id).map((x) => x.id),
      });
    });
  }
  return m;
})();

/** The primary (resource-carrying) forme id for each group. */
export const PRIMARY_FORM_ID: Record<string, string> = Object.fromEntries(
  Object.entries(FORM_GROUPS).map(([group, members]) => [group, members[0].id]),
);
