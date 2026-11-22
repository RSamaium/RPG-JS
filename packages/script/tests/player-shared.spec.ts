import { describe, expect, it } from "vitest";
import { GAME_API_DESCRIPTION, GAME_API_IMPL, apiInfo, compileProgram, globalNames, hostFromApi } from "../src/core";
import { parseScript } from "../src/parse";
import { checkScript, describeGameApi, simulate } from "../src/testing/tools";

/**
 * `shared({ name: { scope: "player" } })`: a property of each player, read and changed with `$player.shared.<name>`.
 * See https://github.com/RSamaium/RPG-JS/issues/506
 */
const WOOD = `shared({ wood: { initial: 0, scope: "player", persist: true }, stock: { initial: 10 } });`;
const diag = (source: string) => checkScript(source).diagnostics.map((d) => d.message);

const run = async (source: string, world: object = {}) => {
  const r = await simulate({ source, call: { fn: "f" }, world });
  if (!r.ok) throw new Error(r.error ?? JSON.stringify(r.diagnostics));
  return r;
};

describe("shared properties of each player: shared({ name: { scope: \"player\" } })", () => {
  it("keeps the value on the player of the script, apart from the properties of the room", async () => {
    const r = await run(`${WOOD}
      export function f() {
        $player.shared.wood += 2;
        $player.shared.wood -= 1;
        return [$player.shared.wood, $shared.stock];
      }`);

    expect(r.value).toEqual([1, 10]);
    expect(r.state?.player.shared).toEqual({ wood: 1 });
    expect(r.state?.shared).toEqual({ stock: 10 });
    expect(r.effects).toContainEqual({ name: "sync", params: { name: "wood", op: "+=", value: 2, scope: "player" } });
  });

  it("starts from the values the world gives the player", async () => {
    const r = await run(`${WOOD} export function f() { $player.shared.wood += 1; return $player.shared.wood; }`, { player: { shared: { wood: 5 } } });
    expect(r.value).toBe(6);
  });

  it("takes from a number of the player only when enough is left", async () => {
    const r = await run(`${WOOD} export function f() { return [$player.shared.take("wood", 3), $player.shared.take("wood", 3), $player.shared.wood]; }`, { player: { shared: { wood: 4 } } });
    expect(r.value).toEqual([true, false, 1]);
  });

  it("keeps the rules of a shared property: a value of the same kind, plain and bounded", async () => {
    await expect(run(`${WOOD} export function f() { $player.shared.wood = "a lot"; }`)).rejects.toThrow(/holds number/);
    await expect(run(`${WOOD} export function f() { $player.shared.wood = { a: 1 }; }`)).rejects.toThrow();
  });

  it("refuses at check time a name that is not declared for the player, and says where it is declared", () => {
    expect(diag(`${WOOD} export function f() { return $player.shared.wod; }`)[0]).toMatch(/"\$player.shared.wod" is not declared.*Declared: wood/);
    expect(diag(`${WOOD} export function f() { return $player.shared.stock; }`)[0]).toMatch(/"stock" is shared by the room: use \$shared.stock/);
    expect(diag(`${WOOD} export function f() { return $shared.wood; }`)[0]).toMatch(/"wood" is a property of each player: use \$player.shared.wood/);
    expect(diag(`${WOOD} export function f() { $player.shared.take("wod", 1); }`)).toEqual([]);
  });

  it("refuses a scope it does not know, and gives no way around $player.shared", () => {
    expect(diag(`shared({ wood: { initial: 0, scope: "guild" } });`)[0]).toMatch(/"scope" of "wood" must be "room" or "player"/);
    expect(diag(`${WOOD} export function f() { return $playerShared.wood; }`)[0]).toMatch(/\$playerShared/);
  });

  it("cannot replace $player.shared itself", async () => {
    await expect(run(`${WOOD} export function f() { $player.shared = 3; }`)).rejects.toThrow(/"\$player.shared" cannot be assigned/);
  });

  it("still runs in a world written before it, and says what is missing when a script uses it", async () => {
    const program = compileProgram(parseScript(`${WOOD} export function f() { return $player.shared.wood; } export function g() { return 1; }`), globalNames(GAME_API_DESCRIPTION), apiInfo(GAME_API_DESCRIPTION));
    // a ScriptWorld of a host, without playerSharedProps
    const world = { sharedProps: { has: () => true, get: () => 10, set: () => undefined } } as any;
    const host = hostFromApi(GAME_API_DESCRIPTION, GAME_API_IMPL, world);
    const limits = { steps: 100, iterations: 10 };

    expect((await program.call("g", [], host, limits)).value).toBe(1);
    await expect(program.call("f", [], host, limits)).rejects.toThrow(/keeps no properties of the player/);
  });

  it("describes $player.shared and the scope to the agents, without a global of its own", () => {
    const api = describeGameApi();
    expect(api).toContain('scope: "player"');
    expect(api).toMatch(/readonly shared: \{/);
    expect(api).not.toContain("declare const $playerShared");
  });
});
