import { afterEach, describe, expect, it, vi } from "vitest";
import { RpgPlayer } from "@rpgjs/server";
import { ScriptService, type HttpTransport } from "../src/server";

/**
 * `$http` on the server: the host gives a transport (`ScriptService({ http })`), the package checks each request before it reaches
 * the transport and bounds what comes back. See https://github.com/RSamaium/RPG-JS/issues/505
 */
afterEach(() => vi.restoreAllMocks());

const oracle = (body: string) => ({ id: "oracle", source: `on("player.levelUp", () => { ${body} });` });

/** A service with a transport, and a player that the scripts act for. */
function serviceWith(send: HttpTransport["send"], options: { scripts?: { id: string; source: string }[]; limits?: object } = {}) {
  const http: HttpTransport = { connections: { meteo_api: { methods: ["GET"] } }, send: vi.fn(send) };
  const service = new ScriptService({ scripts: options.scripts ?? [], http, limits: options.limits as any });
  const player = new RpgPlayer();
  const emit = (signal = "player.levelUp") => service.emit(signal, { gained: 1 }, { player });
  return { service, http, player, emit };
}

describe("$http with the transport of the host", () => {
  it("sends the checked request to the transport, with the script and the player, and gives the answer as data", async () => {
    const { http, player, emit } = serviceWith(async () => ({ status: 200, body: '{"summary":"sunny"}', contentType: "application/json; charset=utf-8" }), {
      scripts: [oracle(`const res = $http.request("meteo_api", { path: "/v1/forecast", query: { city: "Paris" } }); $player.setVariable("sky", res.json.summary);`)],
    });

    const report = await emit();

    expect(report.listeners.every((l) => !l.error)).toBe(true);
    expect(player.getVariable("sky")).toBe("sunny");
    const [request, context] = (http.send as any).mock.calls[0];
    expect(request).toEqual({ connection: "meteo_api", method: "GET", path: "/v1/forecast", query: { city: "Paris" } });
    expect(context).toMatchObject({ script: "oracle", player, maxBytes: 256_000 });
    expect(context.signal).toBeInstanceOf(AbortSignal);
  });

  it("never gives the script what the transport threw: only network, and the next listeners still run", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { player, emit } = serviceWith(async () => { throw new Error("connect ECONNREFUSED 10.0.0.3:5432 token=s3cr3t"); }, {
      scripts: [
        oracle(`$player.setVariable("answer", $http.request("meteo_api"));`),
        { id: "after", source: `on("player.levelUp", () => { $player.setVariable("after", true); });` },
      ],
    });

    await emit();

    expect(player.getVariable("answer")).toEqual({ ok: false, status: 0, error: "network" });
    expect(JSON.stringify(player.getVariable("answer"))).not.toContain("s3cr3t");
    expect(player.getVariable("after")).toBe(true);
    // the author of the host reads the reason in the console of the server
    expect(logged.mock.calls.flat().join(" ")).toContain("ECONNREFUSED");
  });

  it("stops waiting after httpTimeout, aborts the request, and gives timeout", async () => {
    let aborted: AbortSignal | undefined;
    const { player, emit } = serviceWith((_request, context) => { aborted = context.signal; return new Promise(() => undefined); }, {
      scripts: [oracle(`$player.setVariable("late", $http.request("meteo_api").error);`)],
      limits: { steps: 10_000, iterations: 100, httpTimeout: 0.05 },
    });

    await emit();

    expect(player.getVariable("late")).toBe("timeout");
    expect(aborted?.aborted).toBe(true);
  });

  it("refuses a script that uses $http in a service without a transport", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const service = new ScriptService({});
    expect(service.install(oracle(`$http.request("meteo_api");`))).toBe(false);
    expect(service.errors[0].message).toMatch(/\$http/);
  });

  it("refuses at install a literal connection the transport does not declare", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { service } = serviceWith(async () => ({ status: 200 }));
    expect(service.install(oracle(`$http.request("leaderboard");`))).toBe(false);
    expect(service.errors[0].message).toMatch(/unknown http connection "leaderboard"/);
  });

  it("refuses a request made during map.tick, even through a function, before it reaches the transport", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { http, emit } = serviceWith(async () => ({ status: 200 }), {
      scripts: [{ id: "ticker", source: `function ask() { return $http.request("meteo_api"); } on("map.tick", () => { ask(); });` }],
    });

    const report = await emit("map.tick");

    expect(report.listeners[0]?.error).toMatch(/map\.tick/);
    expect(http.send).not.toHaveBeenCalled();
  });
});
