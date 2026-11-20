import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgPlayer, RpgServer } from "@rpgjs/server";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { BattleAi, createActionEnemy, defineActionBattleEnemy } from "@rpgjs/action-battle";
// The real Tiled map of CanvasEngine, as @rpgjs/tiledmap loads it
import { MapClass, TiledParser } from "../../tiledmap/node_modules/@canvasengine/tiled";
import { actionBattleHooks, provideScripts, ScriptService, type ScriptSource, type ScriptStateStore } from "../src/server";

let fixture: TestingFixture | undefined;
// the scripts of an earlier `testing()` still run in the next one: every test writes to names of its own
let n = 0;
beforeEach(() => { n++; });
afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
  vi.restoreAllMocks();
});

const Slime = defineActionBattleEnemy({ graphic: "slime", stats: { maxHp: 40, atk: 5 } });

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "plain", file: "" }],
  player: {
    async onConnected(p) {
      await p.changeMap("plain", { x: 100, y: 100 });
    },
  },
  // The enemies of the game, made with Action Battle
  scriptEnemy: {
    create(event: any, enemyId: string) {
      if (enemyId !== "slime") return undefined;
      createActionEnemy(event, Slime);
      return true;
    },
  },
} as RpgServer);

async function start(scripts: ScriptSource[] | ScriptService) {
  const service = scripts instanceof ScriptService ? scripts : new ScriptService({ scripts });
  fixture = await testing(createModule("RuntimeTest", [{ server: serverModule, client: defineModule({}) }]), {}, { providers: [provideScripts(service)] });
  const player: RpgPlayer = await (await fixture.createClient()).waitForMapChange("plain");
  return { player, map: player.getCurrentMap()! as any, service };
}

const settled = (check: () => void, timeout = 2000) => vi.waitFor(check, { timeout, interval: 10 });
const onLevelUp = (id: string, body: string): ScriptSource => ({ id, source: `on("player.levelUp", () => { ${body} });` });
const levelUp = (player: RpgPlayer) => (player as any).execMethod("onLevelUp", [1]);

describe("$state kept by a store", () => {
  it("is saved after a change, and read back by a service that starts again", async () => {
    const saved = new Map<string, Record<string, unknown>>();
    const stateStore: ScriptStateStore = {
      load: async (script) => saved.get(script),
      save: async (script, data) => { saved.set(script, JSON.parse(JSON.stringify(data))); },
    };
    const source = `on("player.levelUp", () => { $state.kills = ($state.kills ?? 0) + 1; $player.setVariable("kills_${n}", $state.kills); });`;
    const first = new ScriptService({ stateStore, scripts: [{ id: "quest", source }] });
    const { player } = await start(first);
    await levelUp(player);
    await levelUp(player);
    await first.flushState();
    expect(saved.get("quest")).toEqual({ kills: 2 });

    // the server starts again: the state comes back from the store
    const second = new ScriptService({ stateStore, scripts: [{ id: "quest", source }] });
    await second.emit("player.levelUp", { gained: 1, level: 2 }, { player });
    expect(player.getVariable(`kills_${n}`)).toBe(3);
  });

  it("reports a store that fails, and the game goes on", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const service = new ScriptService({
      stateStore: { load: () => { throw new Error("disk"); }, save: () => { throw new Error("full"); } },
      scripts: [onLevelUp("broken", `$state.x = 1; $player.setVariable("broken_${n}", true);`)],
    });
    const { player } = await start(service);
    await levelUp(player);
    await service.flushState();
    expect(player.getVariable(`broken_${n}`)).toBe(true);
    expect(error.mock.calls.map((c) => String(c[0]))).toEqual(expect.arrayContaining([expect.stringMatching(/could not be loaded: disk/), expect.stringMatching(/could not be saved: full/)]));
  });
});

describe("time and logs on a real game", () => {
  it("runs a listener of map.tick at most once per `every` for the player", async () => {
    const { player } = await start([{ id: "tick", source: `on("map.tick", { every: 5 }, () => { $player.setVariable("ticks_${n}", ($player.getVariable("ticks_${n}") ?? 0) + 1); });` }]);
    const { map } = { map: player.getCurrentMap() as any };
    map.setAutoTick(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    map.setAutoTick(false);
    // about 24 ticks in 400 ms: the listener ran once
    expect(player.getVariable(`ticks_${n}`)).toBe(1);
  });

  it("fires a timer, again with repeat, until it is stopped", async () => {
    const { player } = await start([
      onLevelUp("timers", `$player.startTimer("once_${n}", 0.1); $player.startTimer("poison_${n}", 0.1, { repeat: true });`),
      { id: "fire", source: `on("timer.fire", (e) => {
        const count = ($player.getVariable(e.name) ?? 0) + 1;
        $player.setVariable(e.name, count);
        if (e.name === "poison_${n}" && count === 3) { $player.stopTimer(e.name); }
      });` },
    ]);
    await levelUp(player);
    await settled(() => expect(player.getVariable(`poison_${n}`)).toBe(3));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect([player.getVariable(`once_${n}`), player.getVariable(`poison_${n}`)]).toEqual([1, 3]);
  });

  it("keeps the lines a script logs, with the script", async () => {
    const lines: string[] = [];
    const service = new ScriptService({ scripts: [onLevelUp("logger", `log("level up of", $player.name, { at: $player.x });`)], onLog: (l) => lines.push(`${l.script}: ${l.message}`) });
    const { player } = await start(service);
    await levelUp(player);
    expect(lines).toEqual([expect.stringMatching(/^logger: level up of .* \{"at":100\}$/)]);
    expect(service.logs.map((l) => l.script)).toEqual(["logger"]);
  });
});

describe("cutscenes and events of one player on a real game", () => {
  it("freezes the player and moves its camera", async () => {
    const { player, map } = await start([onLevelUp("scene", `$player.canMove = false; $player.cameraFollow("statue_${n}", { smoothMove: true, time: 500 });`)]);
    await map.createDynamicEvent({ id: `statue_${n}`, x: 300, y: 100, event: { name: "statue" } });
    const camera = vi.spyOn(player as any, "cameraFollow");
    await levelUp(player);
    expect((player as any).canMove).toBe(false);
    expect(camera).toHaveBeenCalledWith(map.getEvent(`statue_${n}`), { smoothMove: { enabled: true, time: 500 } });
  });

  it("makes an event that only the player of the script has", async () => {
    const { player, map } = await start([onLevelUp("ghost", `$player.setVariable("ghost_${n}", $map.createDynamicEvent({ id: "ghost_${n}", x: 200, y: 100, forPlayer: true }));`)]);
    await levelUp(player);
    await settled(() => expect(player.getVariable(`ghost_${n}`)).toBeTruthy());
    const id = player.getVariable(`ghost_${n}`) as string;
    expect(map.isEventVisibleForPlayer(id, player)).toBe(true);
    expect(map.isEventVisibleForPlayer(id, "another-player")).toBe(false);
  });
});

describe("enemies of Action Battle", () => {
  it("makes an enemy appear with the AI of Action Battle, and hears when the player defeats it", async () => {
    const service = new ScriptService({ scripts: [
      onLevelUp("spawn", `$player.setVariable("slime_${n}", $map.spawnEnemy({ enemy: "slime", x: 220, y: 100, id: "slime_${n}" }));`),
      { id: "quest", source: `on("enemy.defeated", { where: { enemy: "slime" } }, (e) => { $player.setVariable("defeated_${n}", e.event.id); });` },
    ] });
    const { player, map } = await start(service);
    await levelUp(player);
    await settled(() => expect(player.getVariable(`slime_${n}`)).toBe(`slime_${n}`));
    const slime = map.getEvent(`slime_${n}`);
    expect(slime.battleAi).toBeInstanceOf(BattleAi);

    // what Action Battle gives its hooks after the hit that defeats it
    actionBattleHooks(service).afterHit({ damage: 40, defeated: true, attacker: player, target: slime });
    await settled(() => expect(player.getVariable(`defeated_${n}`)).toBe(`slime_${n}`));
  });
});

describe("a real Tiled map", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.8" orientation="orthogonal" renderorder="right-down" width="4" height="4" tilewidth="32" tileheight="32" infinite="0" nextlayerid="2" nextobjectid="1">
 <tileset firstgid="1" source="props.tsx"/>
 <layer id="1" name="ground" width="4" height="4">
  <data encoding="csv">
1,1,1,1,
1,1,1,1,
1,1,2,1,
1,1,1,1
</data>
 </layer>
</map>`;

  const tileset = `<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.9" name="props" tilewidth="32" tileheight="32" tilecount="2" columns="2">
 <image source="props.png" width="64" height="32"/>
 <tile id="1">
  <properties>
   <property name="interactive" type="bool" value="true"/>
   <property name="kind" value="barrel"/>
  </properties>
 </tile>
</tileset>`;

  it("reads its tiles and hears the player walk against the barrel", async () => {
    const { player, map } = await start([
      onLevelUp("tiles", `$player.setVariable("tile_${n}", $map.getTile(70, 70));`),
      { id: "touch", source: `on("player.touchTile", (e) => { $player.setVariable("touch_${n}", [e.x, e.y, e.properties.kind]); });` },
    ]);
    // as CanvasEngine loads a map: the map, then its tileset
    const parsed: any = new TiledParser(xml).parseMap();
    parsed.tilesets = parsed.tilesets.map((source: any) => ({ ...source, ...new TiledParser(tileset).parseTileset() }));
    map.tiled = new MapClass(parsed);
    await levelUp(player);
    await settled(() => expect(player.getVariable(`tile_${n}`)).toMatchObject({ x: 2, y: 2, properties: { interactive: true, kind: "barrel" } }));

    // above the barrel, facing it
    await player.teleport({ x: 64, y: 34 });
    (player as any).changeDirection("down");
    await (player as any).execMethod("onMove");
    await settled(() => expect(player.getVariable(`touch_${n}`)).toEqual([2, 2, "barrel"]));
  });
});
