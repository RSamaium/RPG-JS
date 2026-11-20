import { describe, expect, it } from "vitest";
import { checkScript, runTests, simulate } from "../src/testing/tools";
import type { WorldInit } from "../src/testing/world";

const run = async (body: string, world: WorldInit & Record<string, unknown> = {}) => {
  const r = await simulate({ source: `export function f() { ${body} }`, call: { fn: "f" }, world });
  if (!r.ok) throw new Error(r.error ?? JSON.stringify(r.diagnostics));
  return r;
};
const fails = async (body: string, world: WorldInit & Record<string, unknown> = {}) => {
  const r = await simulate({ source: `export function f() { ${body} }`, call: { fn: "f" }, world });
  expect(r.ok).toBe(false);
  return String(r.error);
};

describe("1. positions and sight", () => {
  it("reads where the player and the events are, and where they face", async () => {
    const r = await run(
      `return [$player.x, $player.y, $player.direction, $map.getEvent("guard").direction, $event.direction];`,
      { player: { x: 64, y: 96, direction: "left" }, events: [{ id: "guard", x: 10, y: 20, direction: "up" }], event: { direction: "right" } },
    );
    expect(r.value).toEqual([64, 96, "left", "up", "right"]);
  });

  it("refuses to assign a position: the player is moved with teleport", async () => {
    expect(await fails(`$player.x = 3;`)).toMatch(/cannot be assigned/);
  });

  it("measures a distance", async () => {
    expect((await run(`return distance({ x: 0, y: 0 }, { x: 30, y: 40 });`)).value).toBe(50);
    expect((await run(`return distance({ x: $player.x, y: $player.y }, $map.getEvent("e"));`, { player: { x: 0, y: 0 }, events: [{ id: "e", x: 0, y: 12 }] })).value).toBe(12);
  });

  it("sees within the range and the cone of where it faces", async () => {
    const guard = `{ x: 100, y: 100, direction: "right" }`;
    const r = await run(`return [
      inSight(${guard}, { x: 180, y: 100 }),
      inSight(${guard}, { x: 180, y: 160 }),
      inSight(${guard}, { x: 20, y: 100 }),
      inSight(${guard}, { x: 400, y: 100 }),
      inSight(${guard}, { x: 400, y: 100 }, { range: 400 }),
      inSight(${guard}, { x: 180, y: 160 }, { angle: 120 }),
      inSight({ x: 100, y: 100 }, { x: 20, y: 100 }),
    ];`);
    // ahead; 37° off (a 90° cone is ±45°: in); behind; too far; far but in range; wide cone; no direction: a full circle
    expect(r.value).toEqual([true, true, false, false, true, true, true]);
    expect((await run(`return inSight(${guard}, { x: 150, y: 200 });`)).value).toBe(false);
  });

  it("does not see through a wall when walls is asked", async () => {
    const world = { walls: [{ x: 140, y: 80, width: 10, height: 40 }] };
    const r = await run(`return [inSight({ x: 100, y: 100 }, { x: 180, y: 100 }), inSight({ x: 100, y: 100 }, { x: 180, y: 100 }, { walls: true }), inSight({ x: 100, y: 100 }, { x: 100, y: 180 }, { walls: true })];`, world);
    expect(r.value).toEqual([true, false, true]);
  });

  it("refuses an unknown option or direction", async () => {
    expect(await fails(`inSight({ x: 0, y: 0, direction: "north" }, { x: 1, y: 1 });`)).toMatch(/direction/);
    expect(await fails(`inSight({ x: 0, y: 0 }, { x: 1, y: 1 }, { fov: 3 });`)).toMatch(/range, angle and walls/);
  });
});

describe("2. zones attached to an event", () => {
  it("attaches a cone to an event, that counts in the zones of scripts and is removed as they are", async () => {
    const r = await run(
      `const name = $map.attachShape("guard", { name: "guard_sight", radius: 120, angle: 90, limitedByWalls: true, follow: "direction" });
       return [name, $map.removeShape(name), $map.removeShape(name)];`,
      { events: [{ id: "guard" }] },
    );
    expect(r.value).toEqual(["guard_sight", true, false]);
    expect(r.effects[0]).toEqual({ name: "attachShape", params: { eventId: "guard", name: "guard_sight", radius: 120, angle: 90, limitedByWalls: true, follow: "direction" } });
  });

  it("needs an event of the map and a size, and refuses what a zone does not take", async () => {
    expect(await fails(`$map.attachShape("nobody", { radius: 10 });`)).toMatch(/no event "nobody"/);
    expect(await fails(`$map.attachShape("guard", {});`, { events: [{ id: "guard" }] })).toMatch(/radius, or a width and a height/);
    expect(await fails(`$map.attachShape("guard", { radius: 10, follow: "player" });`, { events: [{ id: "guard" }] })).toMatch(/follow/);
    expect(await fails(`$map.attachShape("guard", { radius: 10, offsetX: 3 });`, { events: [{ id: "guard" }] })).toMatch(/not "offsetX"/);
  });

  it("gives the id of the event in the signals of its zone", () => {
    const check = checkScript(`on("player.inShape", { where: { "shape.eventId": "guard" } }, () => {});`);
    expect(check.ok).toBe(true);
  });
});

describe("3. movement", () => {
  it("walks, turns, teleports, follows, flees, stops and hides events", async () => {
    const r = await run(
      `const arrived = $map.moveEvent("guard", { x: 300, y: 40 }, { speed: 3, wait: true });
       $map.turnEvent("guard", "player");
       $map.followPlayer("dog", { distance: 32 });
       $map.fleePlayer("thief");
       $map.stopEvent("thief");
       $map.teleportEvent("thief", { x: 5, y: 6 });
       $map.setEventVisible("ghost", false);
       const hidden = $map.getEvent("ghost") === undefined;
       $map.setEventVisible("ghost", true);
       $player.teleport({ x: 12, y: 14 });
       return [arrived, hidden, $map.getEvent("ghost") !== undefined];`,
      { player: { x: 100, y: 100 }, events: [{ id: "guard" }, { id: "dog" }, { id: "thief" }, { id: "ghost" }] },
    );
    expect(r.value).toEqual([true, true, true]);
    expect(r.state).toMatchObject({
      player: { x: 12, y: 14 },
      events: {
        // the guard came from the top-right: it turns down-left toward the player
        guard: { x: 300, y: 40, direction: "left", moving: null },
        dog: { moving: "follow" },
        thief: { x: 5, y: 6, moving: null },
        ghost: { moving: null },
      },
    });
    expect(r.effects.map((e) => e.name)).toEqual(["moveEvent", "turnEvent", "followPlayer", "fleePlayer", "stopEvent", "teleportEvent", "setEventVisible", "setEventVisible", "teleport"]);
  });

  it("checks what it is given", async () => {
    const world = { events: [{ id: "guard" }] };
    expect(await fails(`$map.moveEvent("guard", "door");`, world)).toMatch(/position \{ x, y \} or to "player"/);
    expect(await fails(`$map.moveEvent("guard", { x: 1, y: 1 }, { speed: 99 });`, world)).toMatch(/speed is a number from 0.1 to 20/);
    expect(await fails(`$map.followPlayer("guard", { distance: -1 });`, world)).toMatch(/distance/);
    expect(await fails(`$map.turnEvent("guard", "north");`, world)).toMatch(/"up", "down", "left", "right"/);
    // a value the check cannot know (a literal of the wrong kind is refused when the script is checked)
    expect(await fails(`const visible = 1; $map.setEventVisible("guard", visible);`, world)).toMatch(/true or false/);
    expect(await fails(`$map.stopEvent("nobody");`, world)).toMatch(/no event "nobody"/);
  });

  it("can be tested as data, with the events in the expectations", async () => {
    const report = await runTests(`on("event.action", () => { $map.followPlayer("dog"); });`, [
      { name: "the dog follows", emit: { signal: "event.action", payload: { event: { id: "dog", name: "", tags: [] } } }, world: { events: [{ id: "dog" }] }, expect: { "events.dog.moving": "follow" } },
    ]);
    expect(report.results[0].failures).toEqual([]);
  });
});

describe("4. scenery", () => {
  it("reads the tile at a position, its collision and its properties", async () => {
    const r = await run(`return [$map.getTile(70, 40), $map.getTile(0, 0).properties];`, {
      tiles: [{ x: 2, y: 1, collision: true, properties: { interactive: true, kind: "barrel" } }],
    });
    expect(r.value).toEqual([
      { x: 2, y: 1, collision: true, properties: { interactive: true, kind: "barrel" }, layers: [{ properties: { interactive: true, kind: "barrel" } }] },
      {},
    ]);
  });

  it("gives nothing on a map without tiles", async () => {
    expect((await run(`return $map.getTile(10, 10) === undefined;`)).value).toBe(true);
  });

  it("listens to the tiles a player touches", () => {
    const check = checkScript(`on("player.touchTile", (e) => { if (e.properties.kind === "barrel") { $player.showText("A barrel at " + e.x); } });`);
    expect(check.ok).toBe(true);
  });
});

describe("5. battle and stats", () => {
  it("reads and changes hp and sp, which stay between 0 and their maximum", async () => {
    const r = await run(
      `$player.hp -= 30; const hurt = $player.hp; $player.hp += 500; const healed = $player.hp; $player.sp = -4;
       return [hurt, healed, $player.sp, $player.maxHp, $player.maxSp];`,
      { player: { hp: 80, maxHp: 120, sp: 10, maxSp: 40 } },
    );
    expect(r.value).toEqual([50, 120, 0, 120, 40]);
    expect(r.state?.player).toMatchObject({ hp: 120, sp: 0 });
  });

  it("caps nothing when the game gives the player no maximum", async () => {
    const r = await run(`$player.hp += 100; return [$player.hp, $player.maxHp];`, { player: { hp: 10, maxHp: 0 } });
    expect(r.value).toEqual([110, 0]);
  });

  it("refuses to assign the maximums, or hp that is not a number", async () => {
    expect(await fails(`$player.maxHp = 3;`)).toMatch(/cannot be assigned/);
    expect(await fails(`$player.hp = "full";`)).toMatch(/finite number/);
  });

  it("starts a battle and waits for how it ended", async () => {
    const r = await run(`const first = $player.startBattle("wolves"); const second = $player.startBattle("boss", { kind: "tactical" }); return [first, second];`, { battles: ["victory", "escape"] });
    expect(r.value).toEqual(["victory", "escape"]);
    expect(r.effects.map((e) => e.params)).toEqual([{ troopId: "wolves" }, { troopId: "boss", kind: "tactical" }]);
    expect(await fails(`$player.startBattle("wolves", { kind: "arena" });`)).toMatch(/"turn" or "tactical"/);
  });

  it("a trap starts a fight and the poison takes HP", async () => {
    const report = await runTests(
      `on("player.inShape", { where: { "shape.name": "trap" } }, () => {
         const outcome = $player.startBattle("wolves");
         if (outcome === "defeat") { $player.hp = 1; }
       });
       on("player.touchTile", (e) => { if (e.properties.kind === "poison") { $player.hp -= 10; } });`,
      [
        { name: "the trap is lost", emit: { signal: "player.inShape", payload: { shape: { name: "trap", eventId: "" } } }, world: { battles: ["defeat"] }, expect: { "player.hp": 1 } },
        { name: "the poison", emit: { signal: "player.touchTile", payload: { x: 1, y: 2, properties: { interactive: true, kind: "poison" } } }, world: { player: { hp: 25 } }, expect: { "player.hp": 15 } },
      ],
    );
    expect(report.results.map((r) => r.failures)).toEqual([[], []]);
  });
});

describe("6. how events look", () => {
  it("changes the graphic of an event, plays its animations and shows emotion bubbles", async () => {
    const r = await run(
      `$map.setEventGraphic("chest", "chest_open");
       $map.playEventAnimation("guard", "attack", 2);
       $map.showEmotionBubble("guard", "surprise");
       $player.showEmotionBubble("like");`,
      { events: [{ id: "chest" }, { id: "guard" }] },
    );
    expect(r.effects).toEqual([
      { name: "setEventGraphic", params: { id: "chest", graphic: "chest_open" } },
      { name: "playEventAnimation", params: { id: "guard", animationName: "attack", times: 2 } },
      { name: "showEmotionBubble", params: { id: "guard", emotion: "surprise" } },
      { name: "showEmotionBubble", params: { emotion: "like" } },
    ]);
  });

  it("checks the event, the emotion and the times", async () => {
    const world = { events: [{ id: "guard" }] };
    expect(await fails(`$map.setEventGraphic("nobody", "x");`, world)).toMatch(/no event "nobody"/);
    expect(await fails(`$map.showEmotionBubble("guard", "<b>");`, world)).toMatch(/an emotion is a name/);
    expect(await fails(`$map.playEventAnimation("guard", "attack", 500);`, world)).toMatch(/times is a number from 1 to 100/);
  });
});

describe("7. states", () => {
  it("gives, reads and takes away the states of the player", async () => {
    const r = await run(
      `const given = $player.addState("poison"); const twice = $player.addState("poison");
       const had = $player.hasState("poison"); const list = $player.getStates();
       const removed = $player.removeState("poison"); const again = $player.removeState("poison");
       return [given, twice, had, list, removed, again, $player.hasState("poison")];`,
      { sheet: { states: ["haste"] } },
    );
    expect(r.value).toEqual([true, false, true, ["haste", "poison"], true, false, false]);
  });
});

describe("8. experience, skills, equipment and items", () => {
  it("gives experience, which only grows", async () => {
    const r = await run(`$player.exp += 120; $player.exp = -5; return $player.exp;`, { sheet: { exp: 30 } });
    expect(r.value).toBe(0);
    expect(await fails(`$player.exp -= 3;`)).toMatch(/only = and \+=/);
  });

  it("teaches and makes forget skills", async () => {
    const r = await run(
      `return [$player.learnSkill("fire"), $player.learnSkill("fire"), $player.hasSkill("fire"), $player.getSkills(), $player.forgetSkill("ice"), $player.forgetSkill("fire"), $player.getSkills()];`,
      { sheet: { skills: ["heal"] } },
    );
    expect(r.value).toEqual([true, false, true, ["heal", "fire"], false, true, ["heal"]]);
  });

  it("equips and uses items of the inventory", async () => {
    const r = await run(
      `const equipped = $player.equip("sword"); const isIt = $player.isEquipped("sword"); const off = $player.equip("sword", false);
       const notMine = $player.equip("axe"); const used = $player.useItem("potion"); const cannot = $player.useItem("sword");
       return [equipped, isIt, off, notMine, used, cannot, $player.getItem("potion").quantity];`,
      { player: { items: { sword: 1, potion: 2 } }, sheet: { equipment: ["sword", "axe"], usable: ["potion"] } },
    );
    expect(r.value).toEqual([true, true, true, false, true, false, 1]);
    expect(await fails(`const on = "yes"; $player.equip("sword", on);`)).toMatch(/true or false/);
  });
});

describe("9. enemies", () => {
  it("makes an enemy appear, which counts in the events of scripts and can be removed", async () => {
    const r = await run(
      `const id = $map.spawnEnemy({ enemy: "slime", x: 200, y: 120, id: "slime-1" });
       return [id, $map.getEvent(id).name, $map.removeEvent(id)];`,
      { enemies: ["slime"] },
    );
    expect(r.value).toEqual(["slime-1", "slime", true]);
    expect(r.effects[0]).toEqual({ name: "spawnEnemy", params: { enemy: "slime", x: 200, y: 120, id: "slime-1" } });
  });

  it("refuses an enemy the game does not have, or what an enemy is not described by", async () => {
    expect(await fails(`$map.spawnEnemy({ enemy: "dragon", x: 1, y: 1 });`, { enemies: ["slime"] })).toMatch(/no enemy "dragon"/);
    expect(await fails(`$map.spawnEnemy({ enemy: "slime", x: 1, y: 1, hp: 3 });`)).toMatch(/not "hp"/);
  });
});
