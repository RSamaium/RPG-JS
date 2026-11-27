import { describe, expect, it } from "vitest";
import {
  beginBattle,
  createRules,
  forbids,
  previewTimeline,
  runCommand,
  nextActor,
  turnDelay,
  type BattleState,
  type Beat,
  type Command,
} from "../core";
import { battle, goblin, hero, setup, stats } from "./fixtures";
import { createBattle, syncVitals } from "../core";

const rules = createRules();

/** Begin and return the first state where a hero must act. */
function started(state = battle()) {
  return beginBattle(state, rules);
}

function act(state: BattleState, command: Command) {
  return runCommand(state, { revision: state.revision, actor: state.actor!, command }, rules);
}

const firstEnemy = (s: BattleState) => s.combatants.find((c) => c.side === "enemy" && c.hp > 0)!;

describe("setup", () => {
  it("letters duplicate enemy names and fills gauges", () => {
    const s = battle();
    expect(s.combatants.filter((c) => c.side === "enemy").map((c) => c.name)).toEqual([
      "Gobelin A",
      "Gobelin B",
    ]);
    expect(s.combatants[0].limit).toEqual({ value: 0, max: 100, skill: "burst" });
    expect(s.combatants[2].stagger).toEqual({ value: 20, max: 20, broken: false });
  });

  it("drops skills missing from the catalog", () => {
    const s = createBattle(setup({ allies: [hero({ skills: ["slash", "nope"] })] }));
    expect(s.combatants[0].skills).toEqual(["slash"]);
  });
});

describe("timeline", () => {
  it("faster combatants act more often", () => {
    const s = battle({
      allies: [hero({ stats: stats({ agi: 80 }) })],
      enemies: [goblin("g1", { stats: stats({ agi: 10 }) })],
    });
    const order = previewTimeline(s, 12);
    const heroTurns = order.filter((id) => id === "hero").length;
    expect(heroTurns).toBeGreaterThan(order.length - heroTurns);
  });

  it("previews a lighter action coming back sooner", () => {
    const { state } = started();
    const heavy = previewTimeline(state, 8, { weight: 2 });
    const light = previewTimeline(state, 8, { weight: 0.5 });
    const index = (o: string[]) => o.indexOf(state.actor!, 1);
    expect(index(light)).toBeLessThanOrEqual(index(heavy));
  });

  it("begins on a hero turn and exposes the order", () => {
    const { state, beats } = started();
    expect(beats[0].t).toBe("intro");
    const last = beats.at(-1)!;
    expect(last.t).toBe("turn");
    expect(state.actor).toBe((last as Extract<Beat, { t: "turn" }>).actor);
    expect(state.combatants.find((c) => c.id === state.actor)!.side).toBe("ally");
  });
});

describe("commands", () => {
  it("rejects stale revisions and out-of-turn actors", () => {
    const { state } = started();
    const target = firstEnemy(state).id;
    expect(runCommand(state, { revision: state.revision - 1, actor: state.actor!, command: { type: "attack", target } }, rules).error).toBe("turnBattle.error.stale");
    const other = state.combatants.find((c) => c.side === "ally" && c.id !== state.actor)!;
    expect(runCommand(state, { revision: state.revision, actor: other.id, command: { type: "attack", target } }, rules).error).toBe("turnBattle.error.notYourTurn");
  });

  it("rejects commands of another owner", () => {
    const s = createBattle(setup({ allies: [hero({ owner: "p1" })] }));
    const { state } = beginBattle(s, rules);
    const out = runCommand(state, { revision: state.revision, actor: state.actor!, command: { type: "guard" } }, rules, "p2");
    expect(out.error).toBe("turnBattle.error.notYourTurn");
  });

  it("attacks produce a melee action with damage and a new hero turn", () => {
    const { state } = started();
    const target = firstEnemy(state);
    const out = act(state, { type: "attack", target: target.id });
    expect(out.error).toBeUndefined();
    const action = out.beats[0] as Extract<Beat, { t: "action" }>;
    expect(action).toMatchObject({ t: "action", kind: "attack", melee: true, targets: [target.id] });
    expect(action.waves[0][0].amount).toBeGreaterThan(0);
    expect(out.state.revision).toBe(state.revision + 1);
    expect(["turn", "end"]).toContain(out.beats.at(-1)!.t);
  });

  it("spends SP, hits every wave and never mutates the input state", () => {
    const { state } = started();
    const before = JSON.stringify(state);
    const actor = state.combatants.find((c) => c.id === state.actor)!;
    const out = act(state, { type: "skill", skill: "slash", target: firstEnemy(state).id });
    const action = out.beats[0] as Extract<Beat, { t: "action" }>;
    expect(action.waves.length).toBe(2);
    expect(out.state.combatants.find((c) => c.id === actor.id)!.sp).toBeLessThanOrEqual(actor.sp - 10 + 0);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("queues the triggers of a plain skill: cast, then impact on the target it reached", () => {
    const { state } = started();
    const s = structuredClone(state);
    s.catalog.skills["slash"] = { ...s.catalog.skills["slash"], triggers: ["cast", "impact"] };
    const target = firstEnemy(s).id;

    const out = act(s, { type: "skill", skill: "slash", target });

    expect(out.state.calls).toEqual([
      { skill: "slash", phase: "cast", actor: s.actor },
      { skill: "slash", phase: "impact", actor: s.actor, target },
    ]);
    expect(act(state, { type: "skill", skill: "slash", target }).state.calls ?? []).toEqual([]);
  });

  it("takes the life and the SP the game gave a unit (a trigger), within its limits, and says so in a beat", () => {
    const { state } = started();
    const id = state.actor!;
    const unit = state.combatants.find((c) => c.id === id)!;

    const out = syncVitals(state, id, { hp: 50, sp: unit.stats.maxSp + 40 });

    const after = out.state.combatants.find((c) => c.id === id)!;
    expect(after.hp).toBe(50);
    expect(after.sp).toBe(unit.stats.maxSp);
    expect(out.state.revision).toBe(state.revision + 1);
    expect(out.beats).toEqual([{ t: "sync", snap: expect.arrayContaining([expect.objectContaining({ id, hp: 50 })]) }]);
    expect(state.combatants.find((c) => c.id === id)!.hp).toBe(unit.hp);
  });

  it("keeps a unit standing and ignores what changes nothing or is unknown", () => {
    const { state } = started();
    const id = state.actor!;
    const unit = state.combatants.find((c) => c.id === id)!;

    expect(syncVitals(state, id, { hp: -20 }).state.combatants.find((c) => c.id === id)!.hp).toBe(1);
    expect(syncVitals(state, id, { hp: unit.hp, sp: unit.sp })).toEqual({ state, beats: [] });
    expect(syncVitals(state, "ghost", { hp: 5 })).toEqual({ state, beats: [] });
  });

  it("puts what a skill plays on its action beat: the effect of the cast, the sounds of the cast and of each hit", () => {
    const { state } = started();
    const s = structuredClone(state);
    s.catalog.skills["slash"] = { ...s.catalog.skills["slash"], castFx: "chargeUp", castSound: "cast-id", impactSound: "hit-id", impactAnimation: "sheet-id" };

    const action = act(s, { type: "skill", skill: "slash", target: firstEnemy(s).id }).beats[0] as Extract<Beat, { t: "action" }>;

    expect(action).toMatchObject({ castFx: "chargeUp", castSound: "cast-id", impactSound: "hit-id", impactAnimation: "sheet-id" });
    const plain = act(state, { type: "skill", skill: "slash", target: firstEnemy(state).id }).beats[0] as Extract<Beat, { t: "action" }>;
    expect(plain).not.toHaveProperty("castSound");
  });

  it("puts the Visual Effects of a skill on its action beat, whole", () => {
    const { state } = started();
    const s = structuredClone(state);
    const effect = { base: "fireball", duration: 900, hitAt: 500, sounds: [{ sound: "boom", start: 500 }] };
    const impactEffect = { base: "explosionSmall", duration: 400, hitAt: 100 };
    s.catalog.skills["slash"] = { ...s.catalog.skills["slash"], effect, impactEffect };

    const action = act(s, { type: "skill", skill: "slash", target: firstEnemy(s).id }).beats[0] as Extract<Beat, { t: "action" }>;

    expect(action).toMatchObject({ effect, impactEffect });
    expect(action).not.toHaveProperty("castEffect");
    expect(JSON.parse(JSON.stringify(action))).toEqual(action);
  });

  it("refuses skills without enough SP", () => {
    const { state } = started();
    const s = structuredClone(state);
    s.combatants.find((c) => c.id === s.actor)!.sp = 0;
    expect(act(s, { type: "skill", skill: "slash", target: firstEnemy(s).id }).error).toBe("turnBattle.error.noSp");
  });

  it("weakness hits are flagged, amplified and break stagger", () => {
    const { state } = started();
    const out = act(state, { type: "skill", skill: "fire" });
    const action = out.beats[0] as Extract<Beat, { t: "action" }>;
    expect(action.targets.length).toBe(2);
    for (const hit of action.waves[0]) expect(hit.weak).toBe(true);
    expect(action.waves[0].some((h) => h.broke || h.ko)).toBe(true);
  });

  it("broken enemies lose their next turn to recover", () => {
    const { state } = started();
    const s = structuredClone(state);
    const g = firstEnemy(s);
    g.stagger!.broken = true;
    g.stagger!.value = 0;
    g.nextAt = -1; // acts right away
    s.combatants.forEach((c) => c.side === "ally" && c.id !== s.actor && (c.nextAt = 999));
    const out = act(s, { type: "guard" });
    expect(out.beats.some((b) => b.t === "recover" && b.actor === g.id)).toBe(true);
    const after = out.state.combatants.find((c) => c.id === g.id)!;
    expect(after.stagger).toMatchObject({ broken: false, value: after.stagger!.max });
  });

  it("guard halves damage until the guard's next turn", () => {
    const { state } = started();
    const out = act(state, { type: "guard" });
    expect(out.beats[0]).toMatchObject({ t: "guard", actor: state.actor });
    const next = out.state.combatants.find((c) => c.id === out.state.actor)!;
    expect(next.guarding).toBe(false);
  });

  it("puts the Visual Effect of an item on its action beat, whole", () => {
    const { state } = started();
    const s = structuredClone(state);
    const effect = { base: "healPulse", duration: 700, hitAt: 300, sounds: [{ sound: "chime", start: 0 }] };
    s.catalog.items["potion"] = { ...s.catalog.items["potion"], effect };
    const ally = s.combatants.find((c) => c.side === "ally")!;
    ally.hp = 1;

    const action = act(s, { type: "item", item: "potion", target: ally.id }).beats[0] as Extract<Beat, { t: "action" }>;

    expect(action).toMatchObject({ kind: "item", effect, targets: [ally.id] });
    expect(action.waves[0][0]).toMatchObject({ kind: "heal" });
    expect(JSON.parse(JSON.stringify(action))).toEqual(action);
    const plain = act(state, { type: "item", item: "potion", target: ally.id }).beats[0];
    expect(plain).not.toHaveProperty("effect");
  });

  it("items heal, consume inventory and revive fallen allies", () => {
    const { state } = started();
    const s = structuredClone(state);
    const other = s.combatants.find((c) => c.side === "ally" && c.id !== s.actor)!;
    other.hp = 0;
    const out = act(s, { type: "item", item: "phoenix", target: other.id });
    expect(out.error).toBeUndefined();
    const hit = (out.beats[0] as Extract<Beat, { t: "action" }>).waves[0][0];
    expect(hit).toMatchObject({ kind: "heal", revive: true });
    expect(out.state.inventory[""].phoenix).toBe(0);
    expect(out.state.used[""].phoenix).toBe(1);
    expect(act(out.state.actor ? out.state : s, { type: "item", item: "phoenix", target: other.id }).error).toBeTruthy();
  });

  it("limit requires a full gauge and plays a cut-in", () => {
    const { state } = started();
    expect(act(state, { type: "limit" }).error).toBe("turnBattle.error.limitNotReady");
    const s = structuredClone(state);
    const actor = s.combatants.find((c) => c.id === s.actor)!;
    actor.limit!.value = 100;
    const out = act(s, { type: "limit" });
    const action = out.beats[0] as Extract<Beat, { t: "action" }>;
    expect(action.cutin?.line).toBe("Lumière !");
    expect(out.state.combatants.find((c) => c.id === actor.id)!.limit!.value).toBeLessThan(100);
  });

  it("refuses a limit whose skill the catalog does not hold, instead of throwing", () => {
    const { state } = started();
    const s = structuredClone(state);
    const actor = s.combatants.find((c) => c.id === s.actor)!;
    actor.limit!.value = 100;
    delete s.catalog.skills[actor.limit!.skill];
    let out: ReturnType<typeof act> | undefined;
    expect(() => (out = act(s, { type: "limit" }))).not.toThrow();
    expect(out!.error).toBe("turnBattle.error.unknownSkill");
    expect(out!.state).toBe(s);
  });
});

describe("full battle", () => {
  it("is deterministic for a seed and always terminates with rewards", () => {
    const play = () => {
      let { state } = started(battle({ seed: 7 }));
      const beats: Beat[] = [];
      for (let i = 0; i < 200 && !state.result; i++) {
        const out = act(state, { type: "attack", target: firstEnemy(state).id });
        expect(out.error).toBeUndefined();
        beats.push(...out.beats);
        state = out.state;
      }
      return { state, beats };
    };
    const a = play();
    const b = play();
    expect(a.state.result).not.toBeNull();
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
    expect(a.beats.at(-1)!.t).toBe("end");
    if (a.state.result!.outcome === "victory") {
      expect(a.state.result!.exp).toBeGreaterThanOrEqual(20);
      expect(a.state.result!.items[0]).toMatchObject({ id: "potion", name: "Potion" });
    }
  });

  it("reports defeat when the party falls", () => {
    const s = createBattle(
      setup({
        allies: [hero({ stats: stats({ maxHp: 10, def: 0, agi: 5 }) })],
        enemies: [goblin("g1", { stats: stats({ maxHp: 9999, atk: 200, agi: 90 }) })],
      }),
    );
    let { state } = beginBattle(s, rules);
    for (let i = 0; i < 50 && !state.result; i++) state = act(state, { type: "guard" }).state;
    expect(state.result?.outcome).toBe("defeat");
  });

  it("escape ends the battle without rewards when it succeeds", () => {
    const rulesEscape = createRules({ formulas: { escapeChance: () => 1 } });
    const { state } = beginBattle(battle(), rulesEscape);
    const out = runCommand(state, { revision: state.revision, actor: state.actor!, command: { type: "escape" } }, rulesEscape);
    expect(out.state.result).toMatchObject({ outcome: "escape", exp: 0 });
    expect(out.beats.map((b) => b.t)).toEqual(["escape", "end"]);
  });

  it("custom AI and formulas are honoured", () => {
    const custom = createRules({
      ai: { guardian: () => ({ type: "guard" }) },
      formulas: { damage: () => ({ amount: 1, crit: false }) },
    });
    const s = createBattle(setup({ enemies: [goblin("g1", { ai: "guardian", stagger: 0 })] }));
    let { state, beats } = beginBattle(s, custom);
    const all = [...beats];
    for (let i = 0; i < 5 && !state.result; i++) {
      const out = runCommand(state, { revision: state.revision, actor: state.actor!, command: { type: "attack", target: "g1" } }, custom);
      all.push(...out.beats);
      state = out.state;
    }
    expect(all.some((b) => b.t === "guard" && b.actor === "g1")).toBe(true);
    const damage = all.flatMap((b) => (b.t === "action" ? b.waves.flat() : []));
    expect(damage.every((h) => h.amount <= 2)).toBe(true); // 1, or 1 * guard rounding
  });

  it("nextActor prefers allies on ties", () => {
    const s = battle();
    s.combatants.forEach((c) => (c.nextAt = 5));
    expect(nextActor(s.combatants)!.side).toBe("ally");
    expect(turnDelay({ stats: stats({ agi: 80 }) })).toBeLessThan(turnDelay({ stats: stats({ agi: 10 }) }));
  });
});

describe("rules of a troop", () => {
  const fight = (forbid: NonNullable<BattleState["forbid"]>) => beginBattle(battle({ forbid }), rules).state;
  const attempt = (state: BattleState, command: Command) =>
    act(state, command).error;

  it("everything is allowed by default", () => {
    expect(battle().forbid).toBeUndefined();
  });

  it("refuses the commands the troop forbids to the heroes", () => {
    const state = fight(["attack", "skill", "item", "guard"]);
    const target = firstEnemy(state).id;

    expect(attempt(state, { type: "attack", target })).toBe("turnBattle.error.forbidden");
    expect(attempt(state, { type: "skill", skill: "slash", target })).toBe("turnBattle.error.forbidden");
    expect(attempt(state, { type: "item", item: "potion", target: "hero" })).toBe("turnBattle.error.forbidden");
    expect(attempt(state, { type: "guard" })).toBe("turnBattle.error.forbidden");
  });

  it("forbidding the skills forbids the limit burst too", () => {
    const state = fight(["skill"]);
    state.combatants.find((c) => c.id === state.actor)!.limit!.value = 100;

    expect(attempt(state, { type: "limit" })).toBe("turnBattle.error.forbidden");
  });

  it("keeps allowed what it does not forbid", () => {
    const state = fight(["guard"]);

    expect(attempt(state, { type: "attack", target: firstEnemy(state).id })).toBeUndefined();
  });

  it("forbidding the escape means that the battle cannot be left", () => {
    const state = fight(["escape"]);

    expect(state.canEscape).toBe(false);
    expect(attempt(state, { type: "escape" })).toBe("turnBattle.error.cannotEscape");
  });

  it("is not seen by the enemies, which keep acting", () => {
    const { state, beats } = beginBattle(battle({ forbid: ["attack", "skill", "item", "guard", "escape"] }), rules);

    expect(state.revision).toBeGreaterThan(0);
    expect(beats.length).toBeGreaterThan(0);
  });
});

describe("invincible enemy", () => {
  it("is never defeated: it keeps one hit point", () => {
    const state = battle({ enemies: [goblin("boss", { invincible: true, stats: stats({ maxHp: 10, def: 0 }) })] });
    const started = beginBattle(state, rules).state;
    let current = started;
    for (let i = 0; i < 6 && !current.result; i++) {
      if (!current.actor) break;
      current = act(current, { type: "attack", target: "boss" }).state;
    }

    expect(current.combatants.find((c) => c.id === "boss")!.hp).toBe(1);
    expect(current.result).toBeNull();
  });

  it("does not stop the others from falling", () => {
    const state = battle({ enemies: [goblin("boss", { invincible: true }), goblin("minion", { stats: stats({ maxHp: 1 }) })] });
    let current = beginBattle(state, rules).state;
    current = act(current, { type: "attack", target: "minion" }).state;

    expect(current.combatants.find((c) => c.id === "minion")!.hp).toBe(0);
  });
});

describe("place of a combatant", () => {
  it("is kept when the troop gives one, and absent otherwise", () => {
    const state = battle({ enemies: [goblin("g1", { position: { x: 0.25, y: 0.6 } }), goblin("g2")] });

    expect(state.combatants.find((c) => c.id === "g1")!.position).toEqual({ x: 0.25, y: 0.6 });
    expect(state.combatants.find((c) => c.id === "g2")!.position).toBeUndefined();
  });
});

describe("place of the party", () => {
  it("is kept when the troop gives one, and absent otherwise", () => {
    expect(battle({ heroesPosition: { x: 0.8, y: 0.5 } }).heroesPosition).toEqual({ x: 0.8, y: 0.5 });
    expect(battle().heroesPosition).toBeUndefined();
  });
});

describe("what a troop forbids", () => {
  it("tells it for the menu: the limit burst follows the skills, the escape and the custom commands are not asked", () => {
    const state = { forbid: ["skill", "guard", "escape"] as NonNullable<BattleState["forbid"]> };

    expect(forbids(state, "skill")).toBe(true);
    expect(forbids(state, "limit")).toBe(true);
    expect(forbids(state, "guard")).toBe(true);
    expect(forbids(state, "attack")).toBe(false);
    expect(forbids(state, "escape")).toBe(false);
    expect(forbids(state, "custom")).toBe(false);
    expect(forbids({}, "attack")).toBe(false);
  });
});

describe("music of the victory", () => {
  it("is kept in the state for the client, and absent by default", () => {
    expect(battle({ victoryBgm: "fanfare" }).victoryBgm).toBe("fanfare");
    expect(battle().victoryBgm).toBeUndefined();
  });
});
