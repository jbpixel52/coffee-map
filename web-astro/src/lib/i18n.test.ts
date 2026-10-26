import { describe, expect, it } from "vitest";
import { DICT, LANGS, format, localeFor, t } from "./i18n";

describe("i18n dictionary", () => {
  it("defines exactly the same keys in both languages", () => {
    expect(Object.keys(DICT.es).sort()).toEqual(Object.keys(DICT.en).sort());
  });

  it("has no empty strings", () => {
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(DICT[lang])) {
        expect(value.trim(), `${lang}.${key}`).not.toBe("");
      }
    }
  });

  it("returns the requested language", () => {
    expect(t("en", "followers")).toBe("Followers");
    expect(t("es", "followers")).toBe("Seguidores");
    expect(localeFor("en")).toBe("en-US");
    expect(localeFor("es")).toBe("es-MX");
  });

  it("fills placeholders and leaves unknown ones intact", () => {
    expect(format("☕ {n} in {city}", { n: 12, city: "Tijuana" })).toBe("☕ 12 in Tijuana");
    expect(format("{n} {missing}", { n: 1 })).toBe("1 {missing}");
  });
});
