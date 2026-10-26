import { describe, expect, it } from "vitest";
import {
  gmapsSearchUrl,
  instagramEmbedUrl,
  instagramProfileUrl,
  tiktokSearchUrl,
  tiktokTagSlug,
} from "./popup";

describe("instagramEmbedUrl", () => {
  it("builds the official embed URL for real shortcodes", () => {
    expect(instagramEmbedUrl("C6o2H4uvc5U")).toBe("https://www.instagram.com/p/C6o2H4uvc5U/embed/");
  });

  it("rejects junk codes (URL-injection attempts)", () => {
    expect(instagramEmbedUrl('"><script>alert(1)</script>')).toBeNull();
    expect(instagramEmbedUrl("<bad>")).toBeNull();
    expect(instagramEmbedUrl("no")).toBeNull();
    expect(instagramEmbedUrl(null)).toBeNull();
    expect(instagramEmbedUrl(undefined)).toBeNull();
  });
});

describe("instagramProfileUrl", () => {
  it("encodes the handle", () => {
    expect(instagramProfileUrl("cafe_suculenta")).toBe("https://www.instagram.com/cafe_suculenta/");
    expect(instagramProfileUrl("a b")).toBe("https://www.instagram.com/a%20b/");
  });
});

describe("gmapsSearchUrl", () => {
  it("includes encoded name and coords when known", () => {
    const url = gmapsSearchUrl("Café X", 32.5, -117.0);
    expect(url).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(url).toContain("Caf%C3%A9%20X%2032.5%2C-117");
  });

  it("falls back to the name alone without coords", () => {
    expect(gmapsSearchUrl("Lumi Café")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Lumi%20Caf%C3%A9",
    );
  });
});

describe("tiktokSearchUrl", () => {
  it("searches with the shop's hashtag", () => {
    expect(tiktokSearchUrl("cafe")).toBe("https://www.tiktok.com/search?q=%23cafe");
    expect(tiktokSearchUrl("Granate Café")).toBe("https://www.tiktok.com/search?q=%23granatecafe");
  });

  it("strips punctuation, spaces and accents from the tag", () => {
    expect(tiktokTagSlug("Lux Coffee Bar & Roasters")).toBe("luxcoffeebarroasters");
    expect(tiktokTagSlug("  Ñoño-café #2 ")).toBe("nonocafe2");
  });

  it("empty name yields an empty query", () => {
    expect(tiktokSearchUrl("")).toBe("https://www.tiktok.com/search?q=");
  });
});
