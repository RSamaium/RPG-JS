import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpGameDataProvider } from "./http-game-data-provider";

const provider = () =>
  new HttpGameDataProvider({ apiBaseUrl: "https://api.test/api" } as any);

describe("HttpGameDataProvider requests", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("answers simultaneous requests for the same map with one request", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ id: "m", params: { a: 1 } }) }));
    vi.stubGlobal("fetch", fetchMock);
    const [first, second] = await Promise.all([provider().getMap("m"), provider().getMap("m")]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it("gives each caller its own copy", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ params: { tileset: "a" } }) })));
    const [first, second] = await Promise.all([provider().getMap("m"), provider().getMap("m")]);
    first.params.tileset = "changed";
    expect(second.params.tileset).toBe("a");
  });

  it("reads again once the first request is over", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    await provider().getMap("m");
    await provider().getMap("m");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not remember a failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(provider().getMap("m")).rejects.toThrow("500");
    await expect(provider().getMap("m")).resolves.toEqual({ ok: true });
  });
});
