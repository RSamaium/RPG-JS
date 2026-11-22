import { describe, expect, it } from "vitest";
import { targetInfoOf } from "../client/target-info";
import type { Combatant } from "../core";

const combatant = (over: Partial<Combatant>): Combatant =>
  ({
    id: "c",
    name: "Gobelin A",
    side: "enemy",
    battler: "enemy-goblin",
    hp: 80,
    sp: 5,
    stats: { maxHp: 120, maxSp: 10 },
    weaknesses: ["fire"],
    resists: ["ice"],
    stagger: { value: 40, max: 100, broken: false },
    ...over,
  }) as Combatant;

describe("the card of the target", () => {
  const hero = combatant({ id: "h", side: "ally", name: "Kael" });

  it("hides the numbers and weaknesses of a foe that was not scanned, and shows its guard", () => {
    expect(targetInfoOf(combatant({}), hero)).toMatchObject({
      name: "Gobelin A",
      foe: true,
      known: false,
      hp: 80,
      maxHp: 120,
      stagger: { value: 40, max: 100, broken: false },
    });
  });

  it("shows everything of a scanned foe and of an ally", () => {
    expect(targetInfoOf(combatant({ revealed: true }), hero)).toMatchObject({ known: true, weaknesses: ["fire"], resists: ["ice"] });
    expect(targetInfoOf(combatant({ side: "ally" }), hero)).toMatchObject({ foe: false, known: true, sp: 5, maxSp: 10 });
  });
});
