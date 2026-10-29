import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ShopProps } from "./filter";

// The Python side asserts the same file against export.py, so the exporter and the UI
// cannot drift: a renamed property fails here rather than rendering a blank card.
const schemaPath = resolve(__dirname, "../../../schema/shop-properties.json");
const schema: string[] = JSON.parse(readFileSync(schemaPath, "utf8")).keys;

// A value of the interface's own type: if ShopProps gains or loses a key, this object
// stops type-checking under `tsc --noEmit`.
const sample: ShopProps = {
  id: 1,
  name: "Café",
  instagram: null,
  ig_followers: null,
  ig_full_name: null,
  ig_latest_code: null,
  ig_last_post_at: null,
  website: null,
  address: null,
  sources: ["osm"],
  city: null,
  city_slug: null,
};

describe("shop property contract", () => {
  it("ShopProps declares exactly the keys the exporter writes", () => {
    expect(Object.keys(sample).sort()).toEqual([...schema].sort());
  });

  it("the schema has no duplicates and every key is snake_case or a known camelCase", () => {
    expect(new Set(schema).size).toBe(schema.length);
    for (const key of schema) expect(key).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});
