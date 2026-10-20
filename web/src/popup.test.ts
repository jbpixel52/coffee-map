import { describe, expect, it } from "vitest";
import { escapeHtml, gmapsSearchUrl, instagramEmbedUrl, popupHtml } from "./popup";

describe("escapeHtml", () => {
  it("neutralises tags and quotes", () => {
    expect(escapeHtml('<img src=x onerror="a">')).not.toContain("<img");
    expect(escapeHtml("O'Brien & Sons")).toBe("O&#39;Brien &amp; Sons");
  });
});

describe("instagramEmbedUrl", () => {
  it("builds the official embed URL for real shortcodes", () => {
    expect(instagramEmbedUrl("C6o2H4uvc5U")).toBe("https://www.instagram.com/p/C6o2H4uvc5U/embed/");
  });

  it("rejects junk codes (URL-injection attempts)", () => {
    expect(instagramEmbedUrl('"><script>alert(1)</script>')).toBeNull();
    expect(instagramEmbedUrl("no")).toBeNull();
    expect(instagramEmbedUrl(null)).toBeNull();
    expect(instagramEmbedUrl(undefined)).toBeNull();
  });
});

describe("popupHtml", () => {
  const base = { name: "Lux Coffee Bar & Roasters" };

  it("renders the iframe preview with the latest post when a code exists", () => {
    const html = popupHtml({
      ...base,
      instagram: "luxcoffeebar",
      ig_followers: 1392,
      ig_latest_code: "C6o2H4uvc5U",
    });
    expect(html).toContain(
      '<iframe class="popup-embed" src="https://www.instagram.com/p/C6o2H4uvc5U/embed/"',
    );
    expect(html).toContain("@luxcoffeebar");
    expect(html).toContain("1392 seguidores");
    expect(html).toContain('href="https://www.instagram.com/luxcoffeebar/"');
  });

  it("links the profile without an iframe when no post code is known", () => {
    const html = popupHtml({ ...base, instagram: "luxcoffeebar" });
    expect(html).not.toContain("<iframe");
    expect(html).toContain('href="https://www.instagram.com/luxcoffeebar/"');
  });

  it("degrades to a no-IG note for shops without instagram", () => {
    const html = popupHtml(base);
    expect(html).toContain("Sin Instagram conocido");
    expect(html).not.toContain("<iframe");
  });

  it("escapes hostile names and handles", () => {
    const html = popupHtml({
      name: "<b>x</b>",
      instagram: '"><script>',
      ig_latest_code: "<bad>",
      ig_full_name: "<i>y</i>",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<i>");
    expect(html).not.toContain("<iframe");
  });

  it("includes a google maps link with encoded name and coords", () => {
    const url = gmapsSearchUrl("Café X", 32.5, -117.0);
    expect(url).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(url).toContain("Caf%C3%A9%20X%2032.5%2C-117");
  });

  it("suppresses an IG display name that only differs by case/accents", () => {
    const html = popupHtml({
      ...base,
      instagram: "luxcoffeebar",
      ig_full_name: "LUX COFFEE BAR & ROASTERS",
    });
    expect(html).not.toContain("popup-fullname");
  });

  it("keeps a genuinely different IG display name", () => {
    const html = popupHtml({ ...base, instagram: "luxcoffeebar", ig_full_name: "Lux • Cafetería" });
    expect(html).toContain("popup-fullname");
  });

  it("renders the outbound links above the embed so a tall iframe cannot hide them", () => {
    const html = popupHtml({
      ...base,
      instagram: "luxcoffeebar",
      ig_latest_code: "C6o2H4uvc5U",
    });
    expect(html.indexOf("Google Maps ↗")).toBeGreaterThan(-1);
    expect(html.indexOf("Google Maps ↗")).toBeLessThan(html.indexOf("<iframe"));
  });
});
