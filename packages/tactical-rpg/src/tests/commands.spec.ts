import { describe, expect, it } from "vitest";
import { createEncounter } from "./fixture";
import { transition } from "../core/rules";
import type { BattleState } from "../core";

const potion = { id: "potion", name: "Potion", hp: 50, sp: 0 };
/** The demo battle, started, where the allies carry two potions and may do what they want. */
const started = (patch: (state: BattleState) => void = () => undefined) => {
  const state = transition(createEncounter(), { type: "start" }, "ally").state;
  state.items = { potion };
  for (const unit of state.units.filter((u) => u.team === "ally")) unit.items = { potion: 2 };
  patch(state);
  return state;
};
const ally = (state: BattleState, role: string) => state.units.find((u) => u.id === `ally-${role}`)!;

describe("using an item", () => {
  it("restores the HP of an ally next to the unit, spends one item and ends its activation", () => {
    const state = started((s) => {
      ally(s, "warrior").x = 2; ally(s, "warrior").y = 5;
      ally(s, "archer").x = 3; ally(s, "archer").y = 5;
      ally(s, "archer").hp = 10;
    });

    const { state: next, event } = transition(state, { type: "item", unitId: "ally-warrior", targetId: "ally-archer", itemId: "potion" }, "ally");

    expect(ally(next, "archer").hp).toBe(Math.min(ally(next, "archer").maxHp, 60));
    expect(ally(next, "warrior").items.potion).toBe(1);
    expect(ally(next, "warrior").acted).toBe(true);
    expect(event).toMatchObject({ kind: "item", unitId: "ally-warrior", targetId: "ally-archer", itemId: "potion" });
    expect(event.heals).toEqual([{ unitId: "ally-archer", hp: Math.min(50, ally(state, "archer").maxHp - 10), sp: 0 }]);
  });

  it("restores the MP of the unit too, up to its maximum", () => {
    const state = started((s) => {
      s.items = { ether: { id: "ether", name: "Ether", hp: 0, sp: 30 } };
      ally(s, "mage").items = { ether: 1 };
      ally(s, "mage").sp = ally(s, "mage").maxSp - 5;
    });

    const { state: next } = transition(state, { type: "item", unitId: "ally-mage", targetId: "ally-mage", itemId: "ether" }, "ally");

    expect(ally(next, "mage").sp).toBe(ally(next, "mage").maxSp);
  });

  it("is refused without the item, on a unit out of reach, on an enemy, or on a fallen ally", () => {
    const far = started((s) => { ally(s, "warrior").x = 0; ally(s, "warrior").y = 6; ally(s, "archer").x = 8; ally(s, "archer").y = 0; });
    expect(() => transition(far, { type: "item", unitId: "ally-warrior", targetId: "ally-archer", itemId: "potion" }, "ally")).toThrow("tactical.error.target");

    const none = started((s) => { ally(s, "warrior").items = {}; });
    expect(() => transition(none, { type: "item", unitId: "ally-warrior", targetId: "ally-warrior", itemId: "potion" }, "ally")).toThrow("tactical.error.item");

    const enemy = started((s) => { const e = s.units.find((u) => u.team === "enemy")!; ally(s, "warrior").x = e.x; ally(s, "warrior").y = e.y + 1; });
    expect(() => transition(enemy, { type: "item", unitId: "ally-warrior", targetId: "enemy-warrior", itemId: "potion" }, "ally")).toThrow("tactical.error.target");

    const down = started((s) => { ally(s, "archer").hp = 0; ally(s, "warrior").x = ally(s, "archer").x; ally(s, "warrior").y = ally(s, "archer").y + 1; });
    expect(() => transition(down, { type: "item", unitId: "ally-warrior", targetId: "ally-archer", itemId: "potion" }, "ally")).toThrow("tactical.error.target");
  });

  it("never changes the state when it is refused", () => {
    const state = started();
    const copy = structuredClone(state);

    expect(() => transition(state, { type: "item", unitId: "ally-warrior", targetId: "ally-warrior", itemId: "nothing" }, "ally")).toThrow("tactical.error.item");
    expect(state).toEqual(copy);
  });
});

describe("guarding", () => {
  it("ends the activation, and halves what the unit takes until its side plays again", () => {
    let state = started((s) => { ally(s, "warrior").x = 4; ally(s, "warrior").y = 3; });
    const enemy = state.units.find((u) => u.team === "enemy")!;
    enemy.x = 4; enemy.y = 2; enemy.range = 1;
    const plain = transition(state, { type: "endPhase" }, "ally").state;
    const hit = (s: BattleState) => ally(transition(s, { type: "attack", unitId: enemy.id, targetId: "ally-warrior" }, "enemy").state, "warrior").hp;
    const full = ally(plain, "warrior").hp - hit(plain);

    const guarded = transition(state, { type: "guard", unitId: "ally-warrior" }, "ally");
    expect(ally(guarded.state, "warrior")).toMatchObject({ acted: true, guarding: true });
    expect(guarded.event).toMatchObject({ kind: "guard", unitId: "ally-warrior" });
    state = transition(guarded.state, { type: "endPhase" }, "ally").state;
    const half = ally(state, "warrior").hp - hit(state);

    expect(half).toBe(Math.ceil(full / 2));
  });

  it("is over when the side plays again", () => {
    let state = started();
    state = transition(state, { type: "guard", unitId: "ally-warrior" }, "ally").state;
    state = transition(state, { type: "endPhase" }, "ally").state;
    state = transition(state, { type: "endPhase" }, "enemy").state;

    expect(ally(state, "warrior").guarding).toBe(false);
  });
});

describe("fleeing", () => {
  it("ends the battle for the side that flees, which has not won", () => {
    const { state, event } = transition(started(), { type: "escape" }, "ally");

    expect(state).toMatchObject({ winner: "enemy", escaped: true });
    expect(event.kind).toBe("escape");
  });

  it("is not for a duel: the players surrender there", () => {
    const duel = started((s) => { s.versus = [{ id: "b", name: "Bo" }]; });

    expect(() => transition(duel, { type: "escape" }, "ally")).toThrow("tactical.error.forbidden");
  });
});

describe("surrendering", () => {
  it("is only for a duel: against the AI the heroes flee", () => {
    const solo = started();

    expect(() => transition(solo, { type: "surrender" }, "ally")).toThrow("tactical.error.forbidden");
    expect(solo.winner).toBeNull();
  });

  it("concedes a duel at any time", () => {
    const duel = started((s) => { s.versus = [{ id: "b", name: "Bo" }]; });

    const { state, event } = transition(duel, { type: "surrender" }, "ally", [], "a");
    expect(state.winner).toBe("enemy");
    expect(event).toMatchObject({ kind: "surrender", team: "ally" });
  });
});

describe("the rules of the troop", () => {
  const forbid = (rule: string) => started((s) => { s.rules = { canAttack: true, canUseSkills: true, canUseItems: true, canGuard: true, canEscape: true, [rule]: false }; });

  it("forbid to the heroes what they say, and the refusal is a text", () => {
    expect(() => transition(forbid("canAttack"), { type: "attack", unitId: "ally-warrior", targetId: "enemy-warrior" }, "ally")).toThrow("tactical.error.forbidden");
    expect(() => transition(forbid("canUseSkills"), { type: "skill", unitId: "ally-mage", targetId: "enemy-mage", skillId: "ember-nova" }, "ally")).toThrow("tactical.error.forbidden");
    expect(() => transition(forbid("canUseItems"), { type: "item", unitId: "ally-warrior", targetId: "ally-warrior", itemId: "potion" }, "ally")).toThrow("tactical.error.forbidden");
    expect(() => transition(forbid("canGuard"), { type: "guard", unitId: "ally-warrior" }, "ally")).toThrow("tactical.error.forbidden");
    expect(() => transition(forbid("canEscape"), { type: "escape" }, "ally")).toThrow("tactical.error.forbidden");
  });

  it("do not bind the enemies, whose AI plays what it wants", () => {
    let state = forbid("canAttack");
    state = transition(state, { type: "endPhase" }, "ally").state;
    const enemy = state.units.find((u) => u.team === "enemy")!;
    const target = state.units.find((u) => u.team === "ally")!;
    enemy.x = target.x; enemy.y = target.y - 1; enemy.range = 1;

    expect(() => transition(state, { type: "attack", unitId: enemy.id, targetId: target.id }, "enemy")).not.toThrow();
  });

  it("bind the player of the other side in a duel too", () => {
    let state = forbid("canAttack");
    state = transition(state, { type: "endPhase" }, "ally").state;
    const enemy = state.units.find((u) => u.team === "enemy")!;
    const target = state.units.find((u) => u.team === "ally")!;
    enemy.x = target.x; enemy.y = target.y - 1; enemy.range = 1;

    expect(() => transition(state, { type: "attack", unitId: enemy.id, targetId: target.id }, "enemy", [], "bob")).toThrow("tactical.error.forbidden");
  });

  it("let everything through when the troop says nothing", () => {
    const state = started();
    delete (state as Partial<BattleState>).rules;

    expect(() => transition(state, { type: "guard", unitId: "ally-warrior" }, "ally")).not.toThrow();
  });
});

describe("an invincible unit", () => {
  it("keeps one hit point whatever the blow, and is not defeated", () => {
    const state = started((s) => {
      const warrior = ally(s, "warrior");
      const foe = s.units.find((u) => u.team === "enemy")!;
      foe.x = warrior.x + 1;
      foe.y = warrior.y;
      foe.invincible = true;
      foe.hp = 5;
    });
    const foe = state.units.find((u) => u.team === "enemy")!;

    const { state: next, event } = transition(state, { type: "attack", unitId: "ally-warrior", targetId: foe.id }, "ally");

    expect(next.units.find((u) => u.id === foe.id)!.hp).toBe(1);
    expect(event.hits?.[0]).toMatchObject({ damage: 4, killed: false });
  });
});
