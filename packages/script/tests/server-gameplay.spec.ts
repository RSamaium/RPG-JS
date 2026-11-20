import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgPlayer, RpgServer } from "@rpgjs/server";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { provideScripts, type ScriptSource } from "../src/server";

let fixture: TestingFixture | undefined;
// the scripts of an earlier `testing()` still run in the next one: every test writes to names of its own
let n = 0;
beforeEach(() => { n++; });
afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
  vi.restoreAllMocks();
});

/** What the battle system of the game was asked to play, and how it answers. */
const battles: { hook: string; troop: string }[] = [];

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "field", file: "" }],
  player: {
    async onConnected(p) {
      // a player of a game without parameters: hp and sp have no maximum
      (p as any).hp = 120;
      (p as any).sp = 30;
      await p.changeMap("field", { x: 100, y: 100 });
    },
  },
  database: {
    poison: { id: "poison", _type: "state", name: "Poison" },
    fire: { id: "fire", _type: "skill", name: "Fire", spCost: 0 },
    sword: { id: "sword", _type: "weapon", name: "Sword" },
    potion: { id: "potion", _type: "item", name: "Potion", consumable: true, hitRate: 1 },
  },
  // How the game makes the enemies scripts ask for (with Action Battle: createActionEnemy(event, preset))
  scriptEnemy: {
    create(event: any, enemyId: string) {
      if (enemyId !== "slime") return undefined;
      event.setGraphic("slime");
      event.isSlime = true;
      return true;
    },
  },
  // A battle system of the game, as the battle modules implement it
  studioBattle: {
    async start(_player: RpgPlayer, troop: string) {
      battles.push({ hook: "start", troop });
      return { outcome: troop === "boss" ? "defeat" : "victory" };
    },
    async startTactical(_player: RpgPlayer, troop: string) {
      battles.push({ hook: "startTactical", troop });
      return { outcome: "abandon" };
    },
  },
} as RpgServer);

async function start(scripts: ScriptSource[]) {
  fixture = await testing(createModule("GameplayTest", [{ server: serverModule, client: defineModule({}) }]), {}, { providers: [provideScripts({ scripts })] });
  const player: RpgPlayer = await (await fixture.createClient()).waitForMapChange("field");
  return { player, map: player.getCurrentMap()! as any };
}

/** Runs the ticks of the game until the check holds. */
const ticking = (check: () => void, timeout = 4000) =>
  vi.waitFor(async () => { await fixture!.nextTickTimes(5); check(); }, { timeout, interval: 10 });
const settled = (check: () => void) => vi.waitFor(check, { timeout: 2000, interval: 10 });
/** A script that runs its body when the player levels up. */
const onLevelUp = (id: string, body: string): ScriptSource => ({ id, source: `on("player.levelUp", () => { ${body} });` });
const levelUp = (player: RpgPlayer) => (player as any).execMethod("onLevelUp", [1]);

describe("positions, stats and teleport on a real player", () => {
  it("reads where the player is and its points, and changes them", async () => {
    const { player } = await start([onLevelUp("stats", `
      $player.setVariable("read_${n}", [$player.x, $player.y, $player.direction, $player.hp, $player.maxHp, $player.maxSp]);
      $player.hp -= 10;
      $player.sp += 500;
      $player.teleport({ x: 200, y: 150 });
    `)]);
    await levelUp(player);

    await settled(() => expect(player.getVariable(`read_${n}`)).toEqual([100, 100, "down", 120, 0, 0]));
    await settled(() => expect([player.x(), player.y()]).toEqual([200, 150]));
    expect((player as any).hp).toBe(110);
    expect((player as any).sp).toBe(530);
  });

  it("starts a battle with the battle system of the game and gets how it ended", async () => {
    battles.length = 0;
    const { player } = await start([onLevelUp("battle", `
      const first = $player.startBattle("wolves");
      const second = $player.startBattle("boss");
      const third = $player.startBattle("raid", { kind: "tactical" });
      const none = $player.startBattle("duel", { kind: "turn" });
      $player.setVariable("outcomes_${n}", [first, second, third, none]);
    `)]);
    await levelUp(player);

    // a tactical battle the player left counts as an escape; no system plays a turn-based battle here
    await settled(() => expect(player.getVariable(`outcomes_${n}`)).toEqual(["victory", "defeat", "escape", null]));
    expect(battles).toEqual([{ hook: "start", troop: "wolves" }, { hook: "start", troop: "boss" }, { hook: "startTactical", troop: "raid" }]);
  });
});

describe("events moved by scripts on a real map", () => {
  it("walks an event to a position, says it arrived, and emits event.arrived", async () => {
    const { player, map } = await start([
      onLevelUp("walker", `const arrived = $map.moveEvent("guard_${n}", { x: 260, y: 100 }, { wait: true }); $player.setVariable("arrived_${n}", arrived);`),
      { id: "listener", source: `on("event.arrived", { where: { "event.id": "guard_${n}" } }, (e) => { $player.setVariable("heard_${n}", e.event.id); });` },
    ]);
    await map.createDynamicEvent({ id: `guard_${n}`, x: 160, y: 100, event: { name: "guard" } });
    void levelUp(player);

    await ticking(() => expect(player.getVariable(`arrived_${n}`)).toBe(true));
    const guard = map.getEvent(`guard_${n}`);
    expect(Math.abs(guard.x() - 260)).toBeLessThanOrEqual(60);
    await settled(() => expect(player.getVariable(`heard_${n}`)).toBe(`guard_${n}`));
  });

  it("makes an event follow the player, and stops it", async () => {
    const { player, map } = await start([
      onLevelUp("dog", `$map.followPlayer("dog_${n}", { distance: 40 });`),
      { id: "stop", source: `on("player.itemAdd", () => { $map.stopEvent("dog_${n}"); });` },
    ]);
    await map.createDynamicEvent({ id: `dog_${n}`, x: 330, y: 100, event: { name: "dog" } });
    const dog = map.getEvent(`dog_${n}`);
    void levelUp(player);

    await ticking(() => expect(dog.x()).toBeLessThan(290));
    (player as any).execMethod("onItemAdd", [{ itemId: "x", quantity: 1 }]);
    await fixture!.nextTickTimes(5);
    const stoppedAt = dog.x();
    await fixture!.nextTickTimes(30);
    // stopped: it no longer walks to the player (it was more than 100 pixels away)
    expect(Math.abs(dog.x() - stoppedAt)).toBeLessThan(10);
    expect(dog.x()).toBeGreaterThan(200);
  });

  it("turns an event toward the player, teleports it, and hides and shows it", async () => {
    const { player, map } = await start([onLevelUp("stage", `
      $map.turnEvent("npc_${n}", "player");
      const turned = $map.getEvent("npc_${n}").direction;
      $map.teleportEvent("npc_${n}", { x: 300, y: 300 });
      $map.setEventVisible("npc_${n}", false);
      const hidden = $map.getEvent("npc_${n}") === undefined;
      $map.setEventVisible("npc_${n}", true);
      $player.setVariable("stage_${n}", [turned, hidden, $map.getEvent("npc_${n}") !== undefined]);
    `)]);
    await map.createDynamicEvent({ id: `npc_${n}`, x: 100, y: 250, event: { name: "npc" } });
    await levelUp(player);

    // the player is above the event
    await settled(() => expect(player.getVariable(`stage_${n}`)).toEqual(["up", true, true]));
    expect([map.getEvent(`npc_${n}`).x(), map.getEvent(`npc_${n}`).y()]).toEqual([300, 300]);
  });

  it("refuses an event that is not on the map, and the game goes on", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { player } = await start([onLevelUp("ghost", `$map.moveEvent("nobody_${n}", "player");`)]);
    await levelUp(player);
    await settled(() => expect(error.mock.calls.some((c) => String(c[0]).includes(`no event "nobody_${n}"`))).toBe(true));
  });
});

describe("zones attached to events, sight and walls on a real map", () => {
  it("fires player.inShape with the id of the event when the player walks into its zone", async () => {
    const { player, map } = await start([
      onLevelUp("aura", `$map.attachShape("healer_${n}", { name: "aura_${n}", radius: 80 });`),
      { id: "in", source: `on("player.inShape", { where: { "shape.eventId": "healer_${n}" } }, (e) => { $player.setVariable("in_${n}", e.shape.name); });` },
    ]);
    await map.createDynamicEvent({ id: `healer_${n}`, x: 400, y: 100, event: { name: "healer" } });
    await levelUp(player);
    expect(player.getVariable(`in_${n}`)).toBeUndefined();

    await player.teleport({ x: 380, y: 100 });
    await ticking(() => expect(player.getVariable(`in_${n}`)).toBe(`aura_${n}`));
  });

  it("does not see through a wall of the map", async () => {
    const { player, map } = await start([onLevelUp("sight", `
      $player.setVariable("sight_${n}", [
        inSight({ x: 100, y: 100 }, { x: 300, y: 100 }, { range: 400 }),
        inSight({ x: 100, y: 100 }, { x: 300, y: 100 }, { range: 400, walls: true }),
        inSight({ x: 100, y: 300 }, { x: 300, y: 300 }, { range: 400, walls: true }),
      ]);
    `)]);
    map.addStaticHitbox(`wall_${n}`, 200, 50, 16, 100);
    await levelUp(player);
    await settled(() => expect(player.getVariable(`sight_${n}`)).toEqual([true, false, true]));
  });
});

describe("tiles on a real map", () => {
  /** A Tiled map of 10 x 10 tiles of 32 pixels, with a barrel at the tile (3, 3). */
  const tiled = {
    tilewidth: 32, tileheight: 32, width: 10, height: 10,
    getTileByPosition: (x: number, y: number) => {
      const barrel = Math.floor(x / 32) === 3 && Math.floor(y / 32) === 3;
      return { tiles: barrel ? [{ properties: { interactive: true, kind: "barrel" } }] : [{ properties: { ground: "grass" } }], hasCollision: barrel };
    },
  };

  it("reads a tile and hears the player touch an interactive one, once", async () => {
    const { player, map } = await start([
      onLevelUp("tiles", `$player.setVariable("tile_${n}", [$map.getTile(100, 100), $map.getTile(10, 10).properties, $map.getTile(-5, 0) === undefined]);`),
      { id: "touch", source: `on("player.touchTile", (e) => { $player.setVariable("touched_${n}", ($player.getVariable("touched_${n}") ?? 0) + 1); $player.setVariable("kind_${n}", e.properties.kind); });` },
    ]);
    map.tiled = tiled;
    await levelUp(player);
    await settled(() => expect(player.getVariable(`tile_${n}`)).toEqual([
      { x: 3, y: 3, collision: true, properties: { interactive: true, kind: "barrel" }, layers: [{ properties: { interactive: true, kind: "barrel" } }] },
      { ground: "grass" },
      true,
    ]));

    // the player stands just above the barrel and faces it
    await player.teleport({ x: 100, y: 66 });
    (player as any).changeDirection("down");
    await (player as any).execMethod("onMove");
    await (player as any).execMethod("onMove");
    await settled(() => expect(player.getVariable(`kind_${n}`)).toBe("barrel"));
    expect(player.getVariable(`touched_${n}`)).toBe(1);
  });
});

describe("appearance, states, character sheet and enemies on a real game", () => {
  it("changes the graphic of an event, plays its animation and shows emotion bubbles", async () => {
    const { player, map } = await start([onLevelUp("look", `
      $map.setEventGraphic("chest_${n}", "chest_open");
      $map.playEventAnimation("chest_${n}", "attack", 2);
      $map.showEmotionBubble("chest_${n}", "surprise");
      $player.showEmotionBubble("like");
      $player.setVariable("look_${n}", true);
    `)]);
    await map.createDynamicEvent({ id: `chest_${n}`, x: 200, y: 100, event: { name: "chest" } });
    const chest = map.getEvent(`chest_${n}`);
    const bubbles = vi.spyOn(chest, "showEmotionBubble");
    const animations = vi.spyOn(chest, "setAnimation");
    const playerBubbles = vi.spyOn(player as any, "showEmotionBubble");
    await levelUp(player);

    await settled(() => expect(player.getVariable(`look_${n}`)).toBe(true));
    expect(chest.graphics()).toContain("chest_open");
    expect(animations).toHaveBeenCalledWith("attack", 2);
    expect(bubbles).toHaveBeenCalledWith("surprise");
    expect(playerBubbles).toHaveBeenCalledWith("like");
  });

  it("gives and takes states, skills, equipment, items and experience", async () => {
    const { player } = await start([onLevelUp("sheet", `
      $player.addItem("sword", 1);
      $player.addItem("potion", 2);
      $player.setVariable("sheet_${n}", [
        $player.addState("poison"), $player.hasState("poison"), $player.getStates(), $player.removeState("poison"), $player.removeState("poison"),
        $player.learnSkill("fire"), $player.learnSkill("fire"), $player.hasSkill("fire"), $player.getSkills(), $player.forgetSkill("fire"),
        $player.equip("sword"), $player.isEquipped("sword"), $player.equip("potion"),
        $player.useItem("potion"), $player.getItem("potion").quantity, $player.useItem("nothing"),
      ]);
      $player.exp += 50;
    `)]);
    const exp = (player as any).exp;
    await levelUp(player);

    await settled(() => expect(player.getVariable(`sheet_${n}`)).toEqual([
      true, true, ["poison"], true, false,
      true, false, true, ["fire"], true,
      true, true, false,
      true, 1, false,
    ]));
    expect((player as any).exp).toBe(exp + 50);
  });

  it("makes an enemy appear through the enemies of the game, and refuses one the game does not have", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { player, map } = await start([onLevelUp("spawn", `
      const id = $map.spawnEnemy({ enemy: "slime", x: 220, y: 100, id: "slime_${n}" });
      $player.setVariable("spawned_${n}", id);
      $map.spawnEnemy({ enemy: "dragon", x: 260, y: 100, id: "dragon_${n}" });
    `)]);
    await levelUp(player);

    await settled(() => expect(player.getVariable(`spawned_${n}`)).toBe(`slime_${n}`));
    expect(map.getEvent(`slime_${n}`).isSlime).toBe(true);
    expect(map.getEvent(`slime_${n}`).graphics()).toContain("slime");
    await settled(() => expect(error.mock.calls.some((c) => String(c[0]).includes('no enemy "dragon"'))).toBe(true));
    // the event made for the dragon was removed
    expect(map.getEvent(`dragon_${n}`)).toBeUndefined();
  });
});
