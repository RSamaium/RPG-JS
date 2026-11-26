import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import { RpgPlayer, type RpgServer } from "@rpgjs/server";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { ScriptService, provideScripts, type ScriptSource } from "../src/server";

/**
 * `shared({ name: { scope: "player" } })` in a real game: each player has its own value, a synchronized property of the player.
 * See https://github.com/RSamaium/RPG-JS/issues/506
 */
let fixture: TestingFixture | undefined;
// RPGJS keeps the hooks of an earlier `testing()` alive in the next one: every test uses names of its own
let n = 0;
beforeEach(() => { n++; });
afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
  vi.restoreAllMocks();
});
const settled = (check: () => void) => vi.waitFor(check, { timeout: 2000, interval: 10 });

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "forest", file: "" }, { id: "village", file: "" }],
  player: {
    async onConnected(player: RpgPlayer) {
      await player.changeMap("forest", { x: 100, y: 100 });
    },
  },
});

async function start(scripts: ScriptSource[] | ScriptService) {
  const provider = scripts instanceof ScriptService ? provideScripts(scripts) : provideScripts({ scripts });
  fixture = await testing(createModule("PlayerSharedTest", [{ server: serverModule }]), {}, { providers: [provider] });
  const join = async () => (await fixture!.createClient()).waitForMapChange("forest") as Promise<RpgPlayer>;
  return { join };
}

/** The signal of a script property on a player. */
const prop = (player: RpgPlayer, name: string) => (player as any)[`script_${name}`];

const woodcutter = (extra = "") => ({
  id: "woodcutter",
  source: `shared({ wood_${n}: { initial: 2, scope: "player", persist: true }, life_${n}: { initial: 20, scope: "player", client: false } });
    on("player.levelUp", () => { $player.shared.wood_${n} += 1; ${extra} });`,
});

describe("a property of each player, declared by a script", () => {
  it("is on every player from its arrival, with its initial value, before the script runs", async () => {
    const { join } = await start([woodcutter()]);
    const player = await join();

    await settled(() => expect(prop(player, `wood_${n}`)?.()).toBe(2));
    expect(prop(player, `life_${n}`)()).toBe(20);
  });

  it("changes for the player of the script only", async () => {
    const service = new ScriptService({ scripts: [woodcutter()] });
    const { join } = await start(service);
    const chopper = await join();
    // The testing fixture connects one player: the other one is a real player the scripts act for through the service
    const other = new RpgPlayer();
    service.preparePlayer(other);
    expect(prop(other, `wood_${n}`)()).toBe(2);

    chopper.level = chopper.level + 1;
    await settled(() => expect(prop(chopper, `wood_${n}`)()).toBe(3));
    expect(prop(other, `wood_${n}`)()).toBe(2);

    await service.emit("player.levelUp", { gained: 1 }, { player: other, map: chopper.getCurrentMap() });
    expect(prop(other, `wood_${n}`)()).toBe(3);
    expect(prop(chopper, `wood_${n}`)()).toBe(3);
  });

  it("is sent to the clients with client: true (the default), and never with client: false", async () => {
    const { join } = await start([woodcutter()]);
    const player = await join();

    await settled(() => expect(prop(player, `wood_${n}`)).toBeDefined());
    expect(prop(player, `wood_${n}`).options).toMatchObject({ syncToClient: true, persist: true });
    expect(prop(player, `life_${n}`).options).toMatchObject({ syncToClient: false, persist: false });
  });

  it("is saved with the player with persist: true, and comes back when the save is loaded", async () => {
    const { join } = await start([woodcutter()]);
    const player = await join();
    player.level = player.level + 1;
    await settled(() => expect(prop(player, `wood_${n}`)()).toBe(3));

    const saved = JSON.parse(await player.save());
    expect(saved[`script_wood_${n}`]).toBe(3);
    expect(saved).not.toHaveProperty(`script_life_${n}`);

    prop(player, `wood_${n}`).set(0);
    await player.load(saved);
    expect(prop(player, `wood_${n}`)()).toBe(3);
  });

  it("follows the player to another map", async () => {
    const { join } = await start([woodcutter()]);
    const player = await join();
    player.level = player.level + 1;
    await settled(() => expect(prop(player, `wood_${n}`)()).toBe(3));

    await player.changeMap("village", { x: 50, y: 50 });

    const there = (player.getCurrentMap() as any)?.players?.()?.[player.id] ?? player;
    await settled(() => expect(prop(there, `wood_${n}`)?.()).toBe(3));
  });

  it("refuses a second script that declares the same name with other options, and says why", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const service = new ScriptService({ scripts: [woodcutter()] });
    const same = service.install({ id: "same", source: `shared({ wood_${n}: { initial: 2, scope: "player", persist: true } });` });
    const other = service.install({ id: "other", source: `shared({ wood_${n}: { initial: 0, scope: "player" } });` });

    expect(same).toBe(true);
    expect(other).toBe(false);
    expect(service.errors.find((e) => e.script === "other")?.message).toMatch(new RegExp(`"wood_${n}" is already declared for each player by "woodcutter" with other options`));
  });
});
