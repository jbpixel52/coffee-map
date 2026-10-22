/** Shop detail model used by the detail card; derived from GeoJSON properties. */

export interface ShopDetails {
  name: string;
  fullName?: string | null;
  handle?: string | null;
  followers?: number | null;
  code?: string | null;
  lat?: number | null;
  lon?: number | null;
}

/** Normalize raw GeoJSON properties into a ShopDetails. Tolerates junk input. */
export function detailsFromProps(p: Record<string, unknown> | null | undefined): ShopDetails {
  if (!p || typeof p !== "object") return { name: "Desconocido" };
  const followers = p.ig_followers;
  return {
    name: (p.name as string) || "Desconocido",
    fullName: (p.ig_full_name as string | null) ?? null,
    handle: ((p.instagram as string) || "").trim() || null,
    followers: typeof followers === "number" && followers > 0 ? followers : null,
    code: (p.ig_latest_code as string | null) ?? null,
    lat: p.lat as number | null,
    lon: p.lon as number | null,
  };
}
