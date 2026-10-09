import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import payload from "../fixtures/studio-map-v2.json";

const url = "https://example.test/parties/main/map-seed-studio/map/update";

describe("Studio Cloudflare map publication", () => {
  it("rejects an untrusted update", async () => {
    const response = await SELF.fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(response.status).toBe(401);
  });

  it("accepts a trusted Studio v2 payload and a new revision", async () => {
    const publish = (revision: string) =>
      SELF.fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rpgjs-map-update-token": "test-map-update-token",
        },
        body: JSON.stringify({ ...payload, revision }),
      });
    expect((await publish("fixture-v1")).ok).toBe(true);
    expect((await publish("fixture-v2")).ok).toBe(true);
  });
});
