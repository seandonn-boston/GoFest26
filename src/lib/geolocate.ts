import type { UserRegion } from "@/domain/types";

/** Map latitude/longitude to the three region axes Niantic uses for region locks. */
export function regionFromCoords(lat: number, lng: number): UserRegion {
  const ns: UserRegion["ns"] = lat >= 0 ? "N" : "S";
  const ew: UserRegion["ew"] = lng >= 0 ? "E" : "W";
  // Rough longitude bands: Americas (−170..−30), EMEA (−30..60), APAC (the rest).
  let continent: UserRegion["continent"];
  if (lng >= -170 && lng < -30) continent = "americas";
  else if (lng >= -30 && lng < 60) continent = "emea";
  else continent = "apac";
  return { label: "Your location", ns, ew, continent };
}

/**
 * Ask the browser for the user's location (a permission prompt) and resolve to a
 * derived UserRegion, or null if unavailable / denied. Best-effort and quick
 * (low-accuracy is fine — we only need the hemisphere + continent).
 */
export function requestRegion(): Promise<UserRegion | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(regionFromCoords(pos.coords.latitude, pos.coords.longitude)),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  });
}
