import { describe, expect, it } from "vitest";
import { shopSlug } from "./shoplink";

describe("shopSlug", () => {
  it("folds accents, case and punctuation into a url-safe slug", () => {
    expect(shopSlug("Café Matcha")).toBe("cafe-matcha");
    expect(shopSlug("Yosi's Cafe")).toBe("yosis-cafe");
    expect(shopSlug("85°C Bakery Cafe")).toBe("85-c-bakery-cafe");
    expect(shopSlug("Mōri Matcha")).toBe("mori-matcha");
  });

  it("never emits leading, trailing or doubled hyphens", () => {
    for (const name of ["  Café  ", "A -- B", "¡Oh My Matcha!", "—"]) {
      const slug = shopSlug(name);
      expect(slug.startsWith("-")).toBe(false);
      expect(slug.endsWith("-")).toBe(false);
      expect(slug.includes("--")).toBe(false);
    }
  });

  it("is stable for names that differ only in accent or case", () => {
    expect(shopSlug("CAFÉ")).toBe(shopSlug("cafe"));
  });
});
