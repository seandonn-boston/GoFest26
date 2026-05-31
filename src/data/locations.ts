import type { UserRegion } from "@/domain/types";

/**
 * Representative locations covering every combination of the three region axes
 * Niantic uses for region-locked raids. The target audience is Boston, so it is
 * the default; users can pick another preset or adjust the axes manually.
 */
export const LOCATION_PRESETS: UserRegion[] = [
  { label: "Boston, MA (USA)", ns: "N", ew: "W", continent: "americas" },
  { label: "Los Angeles, CA (USA)", ns: "N", ew: "W", continent: "americas" },
  { label: "Mexico City (Mexico)", ns: "N", ew: "W", continent: "americas" },
  { label: "São Paulo (Brazil)", ns: "S", ew: "W", continent: "americas" },
  { label: "London (UK)", ns: "N", ew: "E", continent: "emea" },
  { label: "Cape Town (South Africa)", ns: "S", ew: "E", continent: "emea" },
  { label: "Tokyo (Japan)", ns: "N", ew: "E", continent: "apac" },
  { label: "Singapore", ns: "N", ew: "E", continent: "apac" },
  { label: "Sydney (Australia)", ns: "S", ew: "E", continent: "apac" },
];

/** Default location for this app's primary audience. */
export const DEFAULT_REGION: UserRegion = LOCATION_PRESETS[0];
