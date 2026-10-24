import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("studio-terrain-map component", () => {
  it("gives its container no width or height, which would scale the terrain to the chunks drawn so far", () => {
    const source = readFileSync(resolve(process.cwd(), "packages/studio/src/map-renderer/components/studio-terrain-map.ce"), "utf8");
    const template = source.slice(0, source.indexOf("<script>"));
    expect(template).not.toMatch(/\b(width|height)\s*=/);
  });
});
