import { describe, expect, it } from "vitest";
import { freshness, STALE_AFTER_DAYS } from "./freshness";

const NOW = new Date("2026-10-29T12:00:00Z");

describe("freshness", () => {
  it("counts whole days since generation", () => {
    expect(freshness("2026-10-29T01:00:00Z", NOW)).toEqual({ days: 0, stale: false });
    expect(freshness("2026-10-22T12:00:00Z", NOW).days).toBe(7);
  });

  it("flags data older than the threshold, and only then", () => {
    const edge = new Date(NOW.getTime() - STALE_AFTER_DAYS * 86_400_000).toISOString();
    expect(freshness(edge, NOW).stale).toBe(false);
    const past = new Date(NOW.getTime() - (STALE_AFTER_DAYS + 1) * 86_400_000).toISOString();
    expect(freshness(past, NOW).stale).toBe(true);
  });

  it("treats an unreadable timestamp as unknown, not stale", () => {
    expect(freshness("", NOW)).toEqual({ days: null, stale: false });
    expect(freshness("not-a-date", NOW)).toEqual({ days: null, stale: false });
  });

  it("does not call a future timestamp stale", () => {
    expect(freshness("2026-11-05T00:00:00Z", NOW)).toEqual({ days: -7, stale: false });
  });
});
