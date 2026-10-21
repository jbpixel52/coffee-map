import { describe, it, expect } from "vitest";
import { filterShopNames, sidebarTitle, tiktokSearchUrl } from "./sidebar";

describe("sidebar.ts", () => {
  it("filters shop names correctly", () => {
    const names = ["Barilo Café", "Café de la Paz", "La Principal"];
    expect(filterShopNames(names, "barilo")).toEqual(["Barilo Café"]);
    // "cafe" matches any name containing "cafe" (case/accent-insensitive)
    expect(filterShopNames(names, "cafe")).toEqual(["Barilo Café", "Café de la Paz"]);
    // no query returns all names unchanged
    expect(filterShopNames(names, "")).toEqual(names);
  });

  it("generates correct sidebar title", () => {
    expect(sidebarTitle("Barilo Café")).toBe("TikTok: Barilo Café");
    // empty or null name falls back to "Café"
    expect(sidebarTitle("")).toBe("TikTok: Café");
  });

  it("creates correct TikTok search URL", () => {
    expect(tiktokSearchUrl("cafe")).toBe("https://www.tiktok.com/search?q=cafe");
    expect(tiktokSearchUrl("")).toBe("https://www.tiktok.com/search?q=");
  });
});