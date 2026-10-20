import { describe, expect, it } from "vitest";
import { shopMatches } from "./filter";

const shop = { name: "Patio 17 Café", instagram: "patio17cafe", ig_followers: 1200 };

describe("shopMatches", () => {
  it("matches names accent- and case-insensitively", () => {
    expect(shopMatches(shop, "cafe", false)).toBe(true);
    expect(shopMatches(shop, "PATIO", false)).toBe(true);
  });
  it("matches on the instagram handle", () => {
    expect(shopMatches(shop, "patio17", false)).toBe(true);
  });
  it("filters to instagram-only when asked", () => {
    expect(shopMatches({ ...shop, instagram: null }, "", true)).toBe(false);
    expect(shopMatches(shop, "", true)).toBe(true);
  });
  it("empty query shows everything, junk hides it", () => {
    expect(shopMatches({ ...shop, instagram: null }, "  ", false)).toBe(true);
    expect(shopMatches({ ...shop, instagram: null }, "zzz", false)).toBe(false);
  });
});
