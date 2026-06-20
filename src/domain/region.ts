import type { RaidBoss, RegionScope, UserRegion } from "./types";

/** True when a boss with the given scope is physically available in `region`. */
export function isScopeLocal(scope: RegionScope | undefined, region: UserRegion): boolean {
  if (!scope) return true;
  if (scope.ns && scope.ns !== region.ns) return false;
  if (scope.ew && scope.ew !== region.ew) return false;
  if (scope.continent && scope.continent !== region.continent) return false;
  return true;
}

/** True when the boss can be raided locally (in person) from the player's region. */
export function bossIsLocal(boss: RaidBoss, region: UserRegion): boolean {
  return isScopeLocal(boss.region, region);
}

/** A short human-readable label for a region scope (e.g. "Asia-Pacific only"). */
export function regionScopeLabel(scope: RegionScope | undefined): string | undefined {
  if (!scope) return undefined;
  if (scope.continent === "americas") return "Americas & Greenland";
  if (scope.continent === "emea") return "Europe, Middle East, Africa, India";
  if (scope.continent === "apac") return "Asia-Pacific";
  if (scope.ns === "N") return "Northern Hemisphere";
  if (scope.ns === "S") return "Southern Hemisphere";
  if (scope.ew === "E") return "Eastern Hemisphere";
  if (scope.ew === "W") return "Western Hemisphere";
  return undefined;
}
