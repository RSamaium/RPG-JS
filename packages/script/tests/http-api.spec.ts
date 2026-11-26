import { describe, expect, it } from "vitest";
import { checkScript, describeGameApi, simulate } from "../src/testing/tools";

/**
 * `$http.request(connection, options)`: a request to an outside service through a connection the host declares. The package checks
 * the request and bounds the answer; the host (`HttpTransport`) does the networking.
 * See https://github.com/RSamaium/RPG-JS/issues/505
 */
const METEO = { meteo_api: { status: 200, json: { summary: "sunny", days: [1, 2] } } };
const messages = (source: string, http?: object) => checkScript(source, undefined, { http: http as any }).diagnostics.map((d) => d.message);

const run = async (body: string, http: object = METEO, extra: object = {}) =>
  simulate({ source: `export function f() { ${body} }`, call: { fn: "f" }, http: http as any, ...extra });

describe("$http.request: requests through the connections of the host", () => {
  it("does not exist without connections: not described, and refused when the script is checked", () => {
    expect(describeGameApi()).not.toContain("$http");
    expect(messages(`export function f() { return $http.request("meteo_api"); }`)[0]).toMatch(/unknown name "\$http"/);
  });

  it("is described with the connections of the host", () => {
    const api = describeGameApi(undefined, { http: { connections: { meteo_api: {}, scores: { methods: ["GET", "POST"] } } } });
    expect(api).toContain("declare const $http");
    expect(api).toContain("request(connection: string");
    expect(api).toMatch(/meteo_api.*scores|scores.*meteo_api/);
  });

  it("refuses at check time a literal connection the host does not declare", () => {
    expect(messages(`export function f() { return $http.request("meteo_ap"); }`, { connections: { meteo_api: {} } })[0]).toMatch(/unknown http connection "meteo_ap"/);
    expect(messages(`export function f() { return $http.request("meteo_api", { path: "/v1" }); }`, { connections: { meteo_api: {} } })).toEqual([]);
  });

  it("refuses $http in a listener of map.tick: it would hold the ticks of every player", () => {
    expect(messages(`on("map.tick", () => { $http.request("meteo_api"); });`, { connections: { meteo_api: {} } })[0]).toMatch(/map\.tick/);
  });

  it("gives the answer as data: ok, status and the parsed JSON", async () => {
    const r = await run(`const res = $http.request("meteo_api", { path: "/v1/forecast", query: { city: "Paris", days: 2, hourly: false } }); return [res.ok, res.status, res.json.summary, res.json.days.length];`);

    expect(r.ok).toBe(true);
    expect(r.value).toEqual([true, 200, "sunny", 2]);
    expect(r.effects).toContainEqual({ name: "http", params: { connection: "meteo_api", method: "GET", path: "/v1/forecast", query: { city: "Paris", days: 2, hourly: false } } });
  });

  it("gives a text answer as text, and a status outside 200–299 as not ok", async () => {
    const r = await run(`const a = $http.request("txt"); const b = $http.request("down"); return [a.ok, a.text, a.json, b.ok, b.status];`, {
      txt: { status: 200, text: "hello" },
      down: { status: 503, text: "maintenance" },
    });
    expect(r.value).toEqual([true, "hello", undefined, false, 503]);
  });

  it("gives the error code of the host, and only a known one", async () => {
    const r = await run(`return [$http.request("a").error, $http.request("b").error];`, { a: { error: "quota" }, b: { error: "the database at 10.0.0.3 is down" } });
    expect(r.value).toEqual(["quota", "network"]);
  });

  it.each([
    ["an absolute URL", `{ path: "https://evil.example/x" }`, /path/],
    ["a path without a leading slash", `{ path: "v1" }`, /path/],
    ["a path with //", `{ path: "//evil.example/x" }`, /path/],
    ["a path with ..", `{ path: "/v1/../admin" }`, /path/],
    ["a path with its own query", `{ path: "/v1?token=x" }`, /path/],
    ["a query that is not flat", `{ query: { a: { b: 1 } } }`, /query/],
    ["a method the connection does not allow", `{ method: "DELETE" }`, /"meteo_api" does not allow DELETE/],
    ["an unknown method", `{ method: "TRACE" }`, /method/],
  ])("refuses %s, and the request never reaches the host", async (_label, options, why) => {
    const r = await run(`return $http.request("meteo_api", ${options});`);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(why);
    expect(r.error).toMatch(/\$http\.request/);
    expect(r.effects.filter((e) => e.name === "http")).toEqual([]);
  });

  it("refuses a computed connection name the host does not declare", async () => {
    const r = await run(`const name = "meteo" + "_apy"; return $http.request(name);`);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/unknown http connection "meteo_apy"/);
  });

  it("sends a body with the methods the connection allows", async () => {
    const r = await run(`return $http.request("scores", { method: "POST", path: "/scores", body: { player: "hero", points: [1, 2] } }).ok;`, {
      scores: { methods: ["POST"], status: 201, json: { saved: true } },
    });
    expect(r.value).toBe(true);
    expect(r.effects).toContainEqual({ name: "http", params: { connection: "scores", method: "POST", path: "/scores", body: { player: "hero", points: [1, 2] } } });
  });

  it("gives budget once a handler made its requests (3 by default)", async () => {
    const r = await run(`return [1, 2, 3, 4].map(() => $http.request("meteo_api").error ?? "ok");`);
    expect(r.value).toEqual(["ok", "ok", "ok", "budget"]);
    expect(r.effects.filter((e) => e.name === "http")).toHaveLength(3);
  });

  it("gives too_large for an answer above the limit", async () => {
    const r = await run(`return $http.request("big").error;`, { big: { status: 200, text: "x".repeat(200) } }, { limits: { steps: 1000, iterations: 100, httpBodyMax: 100 } });
    expect(r.value).toBe("too_large");
  });
});
