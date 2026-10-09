import { describe, expect, test } from "vitest";
import { getGraphicKey } from "../src/graphic-key";

describe("Studio media references", () => {
  test("prefers the addressable media UUID to an atlas alias", () => {
    expect(getGraphicKey({ _id: "media-uuid", id: "atlas-alias" })).toBe("media-uuid");
  });
  test("keeps legacy strings and id-only runtime references", () => {
    expect(getGraphicKey("hero")).toBe("hero");
    expect(getGraphicKey({ id: "hero" })).toBe("hero");
    expect(getGraphicKey({ mediaId: "media", id: "alias" })).toBe("media");
    expect(getGraphicKey(null)).toBeNull();
  });
});
