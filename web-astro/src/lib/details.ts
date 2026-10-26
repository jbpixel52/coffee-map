/** Shop detail model used by the detail card; derived from GeoJSON properties. */

export interface ShopDetails {
  id?: number | null;
  name: string;
  fullName?: string | null;
  handle?: string | null;
  followers?: number | null;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  lat?: number | null;
  lon?: number | null;
}

/** Normalize raw GeoJSON properties into a ShopDetails. Tolerates junk input. */
export function detailsFromProps(p: Record<string, unknown> | null | undefined): ShopDetails {
  if (!p || typeof p !== "object") return { name: "—" };
  const followers = p.ig_followers;
  return {
    id: typeof p.id === "number" ? p.id : null,
    name: (p.name as string) || "—",
    fullName: (p.ig_full_name as string | null) ?? null,
    handle: ((p.instagram as string) || "").trim() || null,
    followers: typeof followers === "number" && followers > 0 ? followers : null,
    code: (p.ig_latest_code as string | null) ?? null,
    address: ((p.address as string) || "").trim() || null,
    city: ((p.city as string) || "").trim() || null,
    lat: p.lat as number | null,
    lon: p.lon as number | null,
  };
}
