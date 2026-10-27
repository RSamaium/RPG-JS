import { describe, expect, it } from "vitest";
import { apiInfo, describeApi, globalNames } from "../src/core/api";
import { CompileErrors, compileProgram, type Program } from "../src/core/interpreter";
import { evaluateConditions, matchesWhere } from "../src/core/filter";
import { SignalRegistry } from "../src/core/signals";
import { GAME_API_DESCRIPTION } from "../src/game/description";
import { GAME_API_IMPL } from "../src/game/impl";
import { parseScript } from "../src/parse";
import { SimWorld } from "../src/testing/world";
import { checkScript, simulate } from "../src/testing/tools";

const API = {
  ...GAME_API_DESCRIPTION,
  signals: {
    "skill.cast": {
      doc: "A skill is cast.",
      payload: {
        skill: { type: "object", fields: { id: { type: "string" }, tags: { type: "string[]" } } },
        power: { type: "number" },
      },
    },
    "player.levelUp": { payload: { level: { type: "number" } } },
  },
} as const;

const compile = (source: string, api: any = API): Program => compileProgram(parseScript(source), globalNames(api), apiInfo(api));
const errorOf = (source: string, api: any = API): string => {
  try { compile(source, api); } catch (e) { return e instanceof CompileErrors ? e.errors.map((x) => x.message).join(" | ") : String(e); }
  return "";
};

describe("the filter on a payload (where)", () => {
  const payload = { skill: { id: "fireball", tags: ["fire", "magic"] }, power: 12, map: "town" };

  it("takes a value as equal, and every operator on its own", () => {
    expect(matchesWhere(payload, { map: "town" })).toBe(true);
    expect(matchesWhere(payload, { map: "cave" })).toBe(false);
    expect(matchesWhere(payload, { power: { gte: 12 } })).toBe(true);
    expect(matchesWhere(payload, { power: { gt: 12 } })).toBe(false);
    expect(matchesWhere(payload, { power: { lt: 13, ne: 5 } })).toBe(true);
    expect(matchesWhere(payload, { map: { in: ["town", "cave"] } })).toBe(true);
    expect(matchesWhere(payload, { map: { in: ["cave"] } })).toBe(false);
    expect(matchesWhere(payload, { "skill.tags": { has: "fire" } })).toBe(true);
    expect(matchesWhere(payload, { "skill.tags": { has: "ice" } })).toBe(false);
    expect(matchesWhere(payload, { "skill.missing": { exists: false } })).toBe(true);
  });

  it("needs every entry to hold, and a missing field never matches a comparison", () => {
    expect(matchesWhere(payload, { map: "town", power: { gte: 20 } })).toBe(false);
    expect(matchesWhere(payload, { "skill.nothing": { gte: 1 } })).toBe(false);
    expect(matchesWhere(payload, undefined)).toBe(true);
  });

  it("never reaches the prototype of an object", () => {
    expect(matchesWhere({}, { "constructor.name": "Object" })).toBe(false);
  });
});

describe("the conditions on the player (when)", () => {
  const world = () => new SimWorld({ player: { gold: 50, level: 4, items: { potion: 2 } }, vars: { tournoi: true, visits: 3, open: 0 } });

  it("checks a variable, an item, the gold and the level", () => {
    const player = world().player;
    expect(evaluateConditions([{ variable: "tournoi", eq: true }], player)).toBe(true);
    expect(evaluateConditions([{ variable: "open", eq: true }], player)).toBe(false);
    expect(evaluateConditions([{ variable: "open", ne: true }], player)).toBe(true);
    expect(evaluateConditions([{ variable: "visits", gte: 3 }], player)).toBe(true);
    expect(evaluateConditions([{ variable: "visits", gt: 3 }], player)).toBe(false);
    expect(evaluateConditions([{ variable: "unknown", gte: 0 }], player)).toBe(false); // a variable nobody set is not a number
    expect(evaluateConditions([{ item: "potion" }], player)).toBe(true);
    expect(evaluateConditions([{ item: "potion", gte: 3 }], player)).toBe(false);
    expect(evaluateConditions([{ item: "elixir" }], player)).toBe(false);
    expect(evaluateConditions([{ stat: "gold", gte: 50 }], player)).toBe(true);
    expect(evaluateConditions([{ stat: "level", lt: 4 }], player)).toBe(false);
  });

  it("needs every condition to hold, and holds when there is none", () => {
    const player = world().player;
    expect(evaluateConditions([{ variable: "tournoi", eq: true }, { stat: "level", gte: 5 }], player)).toBe(false);
    expect(evaluateConditions([], player)).toBe(true);
    expect(evaluateConditions(undefined, player)).toBe(true);
  });
});

describe("on(signal, filter, handler)", () => {
  it("keeps the signal, the filter and the handler of each listener, with or without a filter", () => {
    const program = compile(`
      on("player.levelUp", () => { $player.showNotification("up"); });
      on("skill.cast", { where: { "skill.tags": { has: "fire" } }, when: [{ variable: "tournoi", eq: true }] }, (e) => { $player.showNotification(e.skill.id); });
    `);

    expect(program.handlers.map((h) => h.event)).toEqual(["player.levelUp", "skill.cast"]);
    expect(program.handlers[0].filter).toBeUndefined();
    expect(program.handlers[1].filter).toEqual({ where: { "skill.tags": { has: "fire" } }, when: [{ variable: "tournoi", eq: true }] });
  });

  it("refuses a signal the game does not have, and lists the ones it has", () => {
    expect(errorOf(`on("skill.cats", () => {});`)).toMatch(/unknown signal "skill.cats".*player.levelUp, skill.cast/);
  });

  it("accepts any signal name when the API declares no signal", () => {
    expect(errorOf(`on("anything", () => {});`, { ...GAME_API_DESCRIPTION, signals: undefined })).toBe("");
  });

  it("refuses a payload field the signal does not have, and says which it has", () => {
    expect(errorOf(`on("skill.cast", { where: { "skill.mana": 1 } }, () => {});`)).toMatch(/"skill.mana".*skill, power/);
  });

  it("refuses an operator on a field of the wrong type", () => {
    expect(errorOf(`on("skill.cast", { where: { power: { has: 1 } } }, () => {});`)).toMatch(/"has".*list/);
    expect(errorOf(`on("skill.cast", { where: { "skill.id": { gte: 1 } } }, () => {});`)).toMatch(/"gte".*number/);
  });

  it("refuses what a filter is not made of: an unknown key, an unknown operator, a bad condition, a path to the prototype", () => {
    expect(errorOf(`on("skill.cast", { whare: {} }, () => {});`)).toMatch(/where, when/);
    expect(errorOf(`on("skill.cast", { where: { power: { bigger: 1 } } }, () => {});`)).toMatch(/unknown operator "bigger"/);
    expect(errorOf(`on("skill.cast", { when: [{ mood: "happy" }] }, () => {});`)).toMatch(/variable, item, stat/);
    expect(errorOf(`on("skill.cast", { when: [{ variable: "visits" }] }, () => {});`)).toMatch(/comparison/);
    expect(errorOf(`on("skill.cast", { where: { "__proto__.x": 1 } }, () => {});`)).toMatch(/not a valid path/);
  });

  it("takes only data in a filter, never a computed value", () => {
    expect(errorOf(`const n = 3; on("skill.cast", { where: { power: n } }, () => {});`)).not.toBe("");
  });

  it("gives the handler the payload, which it can read and cannot change", async () => {
    const program = compile(`on("skill.cast", (e) => { $player.showNotification(e.skill.id + ":" + e.power); e.power = 99; });`);
    const registry = new SignalRegistry({ description: API, impl: GAME_API_IMPL });
    registry.install("s1", program);
    const worlds: SimWorld[] = [];

    const report = await registry.emit("skill.cast", { skill: { id: "fireball", tags: [] }, power: 5 }, () => { const w = new SimWorld(); worlds.push(w); return w; });

    expect(worlds[0].effects.map((e: any) => e.params.message)).toEqual(["fireball:5"]);
    expect(report.listeners[0]).toMatchObject({ script: "s1", matched: true, ran: false });
    expect(report.listeners[0].error).toMatch(/read-only|cannot be changed|assign/i);
  });

  it("lists the signals in what an agent is given", () => {
    const text = describeApi(API as any);
    expect(text).toContain('signal: "skill.cast"');
    expect(text).toContain("skill: { id: string; tags: string[] }");
    expect(text).toContain("power: number");
  });
});

describe("the registry of listeners", () => {
  const registry = () => new SignalRegistry({ description: API, impl: GAME_API_IMPL });
  const emit = async (r: SignalRegistry, signal: string, payload: unknown, init: ConstructorParameters<typeof SimWorld>[0] = {}) => {
    const said: string[] = [];
    const report = await r.emit(signal, payload, (id) => {
      const world = new SimWorld(init);
      const show = world.player.showNotification.bind(world.player);
      world.player.showNotification = (message, options) => { said.push(`${id}:${message}`); return show(message, options); };
      return world;
    });
    return { said, report };
  };

  it("runs the listeners of a signal in the order the scripts were installed", async () => {
    const r = registry();
    r.install("b", compile(`on("player.levelUp", () => { $player.showNotification("b"); });`));
    r.install("a", compile(`on("player.levelUp", () => { $player.showNotification("a1"); }); on("player.levelUp", () => { $player.showNotification("a2"); });`));

    const { said } = await emit(r, "player.levelUp", { level: 2 });

    expect(said).toEqual(["b:b", "a:a1", "a:a2"]);
  });

  it("runs only the listeners whose filter holds, on the payload and on the player", async () => {
    const r = registry();
    r.install("fire", compile(`on("skill.cast", { where: { "skill.tags": { has: "fire" } } }, () => { $player.showNotification("fire"); });`));
    r.install("ice", compile(`on("skill.cast", { where: { "skill.tags": { has: "ice" } } }, () => { $player.showNotification("ice"); });`));
    r.install("rich", compile(`on("skill.cast", { when: [{ stat: "gold", gte: 500 }] }, () => { $player.showNotification("rich"); });`));
    r.install("any", compile(`on("skill.cast", () => { $player.showNotification("any"); });`));

    const { said, report } = await emit(r, "skill.cast", { skill: { id: "fireball", tags: ["fire"] }, power: 1 });

    expect(said).toEqual(["fire:fire", "any:any"]);
    expect(report.listeners.map((l) => [l.script, l.matched, l.ran])).toEqual([["fire", true, true], ["ice", false, false], ["rich", false, false], ["any", true, true]]);
  });

  it("says why a listener did not run", async () => {
    const r = registry();
    r.install("ice", compile(`on("skill.cast", { where: { "skill.tags": { has: "ice" } } }, () => {});`));
    r.install("rich", compile(`on("skill.cast", { when: [{ stat: "gold", gte: 500 }] }, () => {});`));

    const { report } = await emit(r, "skill.cast", { skill: { id: "x", tags: [] }, power: 1 });

    expect(report.listeners[0].why).toContain("skill.tags");
    expect(report.listeners[1].why).toContain("stat");
  });

  it("does nothing for a signal nobody listens to", async () => {
    const { report } = await emit(registry(), "player.levelUp", { level: 1 });

    expect(report.listeners).toEqual([]);
  });

  it("stops the listeners of a script that is uninstalled, and puts one that is installed again last", async () => {
    const r = registry();
    r.install("a", compile(`on("player.levelUp", () => { $player.showNotification("a"); });`));
    r.install("b", compile(`on("player.levelUp", () => { $player.showNotification("b"); });`));
    r.uninstall("a");
    expect((await emit(r, "player.levelUp", { level: 1 })).said).toEqual(["b:b"]);

    r.install("a", compile(`on("player.levelUp", () => { $player.showNotification("a"); });`));
    r.install("b", compile(`on("player.levelUp", () => { $player.showNotification("b2"); });`));

    expect((await emit(r, "player.levelUp", { level: 1 })).said).toEqual(["a:a", "b:b2"]);
    expect(r.has("a")).toBe(true);
    r.uninstall("a");
    expect(r.has("a")).toBe(false);
  });

  it("keeps going when a listener fails, and reports the failure", async () => {
    const r = registry();
    r.install("loop", compile(`on("player.levelUp", () => { while (true) { $player.gold += 1; } });`));
    r.install("ok", compile(`on("player.levelUp", () => { $player.showNotification("ok"); });`));

    const { said, report } = await emit(r, "player.levelUp", { level: 1 });

    expect(said).toEqual(["ok:ok"]);
    expect(report.listeners[0]).toMatchObject({ script: "loop", matched: true, ran: false });
    expect(report.listeners[0].error).toMatch(/loop/i);
    expect(report.listeners[1]).toMatchObject({ script: "ok", ran: true });
  });

  it("lists who listens to a signal, with the filter, before anything runs", () => {
    const r = registry();
    r.install("fire", compile(`on("skill.cast", { where: { "skill.tags": { has: "fire" } } }, () => {});`));
    r.install("any", compile(`on("skill.cast", () => {}); on("player.levelUp", () => {});`));

    expect(r.listeners("skill.cast")).toEqual([
      { script: "fire", filter: { where: { "skill.tags": { has: "fire" } } } },
      { script: "any", filter: undefined },
    ]);
    expect(r.signals()).toEqual(["skill.cast", "player.levelUp"]);
  });
});

describe("the tools that write a script", () => {
  const SOURCE = `
    on("player.levelUp", { where: { gained: { gte: 2 } } }, (e) => { $player.gold += e.gained; });
    on("player.levelUp", { where: { gained: { lt: 2 } } }, () => { $player.gold = 0; });
  `;

  it("tell what a script listens to, with the filter of each listener", () => {
    const check = checkScript(SOURCE);

    expect(check.ok).toBe(true);
    expect(check.listeners).toEqual([
      { signal: "player.levelUp", filter: { where: { gained: { gte: 2 } } } },
      { signal: "player.levelUp", filter: { where: { gained: { lt: 2 } } } },
    ]);
  });

  it("simulate a signal, and say which listeners it reached", async () => {
    const result = await simulate({ source: SOURCE, emit: { signal: "player.levelUp", payload: { gained: 3 } }, world: { player: { gold: 10 } } });

    expect(result.ok).toBe(true);
    expect(result.state?.player.gold).toBe(13);
    expect(result.listeners?.map((l) => [l.matched, l.ran])).toEqual([[true, true], [false, false]]);
  });

  it("refuse a signal the game does not have, and list the ones it has", () => {
    const check = checkScript(`on("enemy.killed", () => {});`);

    expect(check.ok).toBe(false);
    expect(check.diagnostics[0].message).toMatch(/unknown signal "enemy.killed".*event.action, event.touch, gui.action, player.dead/);
  });
});
