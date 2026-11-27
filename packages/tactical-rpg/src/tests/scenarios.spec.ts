// canvasengine reads `window` when it loads and the project has no DOM test environment: a minimal one is enough here.
vi.hoisted(() => {
  const target = globalThis as Record<string, unknown>;
  target.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {} });
  target.navigator ??= { getGamepads: () => [] };
});
import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", async (original) => ({
  ...(await original<typeof import("@rpgjs/common")>()),
  createModule: (_name: string, value: unknown) => value,
}));
import { play, settle, type Player } from "./scenario-harness";

/**
 * Scenarios played by two players with the keyboard, as in the game: a real battle on the server and a client per
 * player. They check what each player sees and what is written on the players at the end.
 */
afterEach(() => vi.useRealTimers());

/** Both players close the result screen: the battle resolves. */
async function closeResult(...players: Player[]) {
  for (const p of players) await p.keys("action");
  await settle(0);
}
/** One player after the other ends the phase (confirmed), each waiting for their screen. */
async function endPhase(...players: Player[]) {
  for (const p of players) {
    await p.keys("endPhase", "action");
    await settle();
  }
}

describe("co-op: two players against the AI", () => {
  it("a melee enemy walks to a hero and hits it during the enemy phase; the heroes flee with their HP", async () => {
    const { a, b, result } = await play("melee");
    await endPhase(a, b);
    await settle(10000);

    expect(a.view().round).toBe(2);
    expect(a.hint()).toBe("Select a unit to give it an order.");
    const hurt = a.hero().hp;
    expect(hurt).toBeLessThan(100);
    // Bob's screen shows the same battle.
    expect(b.view().units.find((u) => u.id === a.hero().id)?.hp).toBe(hurt);

    a.state.flee();
    await a.keys("action");
    await settle();
    expect(a.view().escaped).toBe(true);
    await closeResult(a, b);
    expect((await result).outcome).toBe("escape");
    expect(a.player.hp).toBe(hurt);
  });

  it("a square skill hits the two enemies at once: victory, and the SP spent are written on the player", async () => {
    const { a, b, result } = await play("area", { a: { skills: ["nova"] } });
    await a.keys("nextUnit", "action");
    // No enemy in reach: the menu opens on the skills, not on a greyed attack.
    expect(a.menu()).toEqual(["attack (greyed)", ">skill", "item (greyed)", "guard", "wait"]);
    await a.keys("action", "action", "up", "up", "up");
    expect(a.state.forecast()).toMatchObject({ hits: 2, amount: 20, remaining: 0 });
    await a.keys("action");
    await settle();

    for (const p of [a, b]) expect(p.view().winner).toBe("ally");
    await closeResult(a, b);
    expect((await result).outcome).toBe("victory");
    expect(a.player.sp).toBe(10);
    expect(b.player.sp).toBe(20);
  });

  it("a skill already used and one too expensive are greyed; an ether gives SP back and is spent", async () => {
    const { a, b, result } = await play("limits", { a: { skills: ["blast", "mega"], items: { ether: 1 } } });
    await a.keys("nextUnit", "action", "action");
    expect(a.state.skillOptions().map((o) => [o.id, o.reason ?? null])).toEqual([["blast", null], ["mega", "tactical.error.sp"]]);
    await a.keys("action", "up", "up", "up", "action");
    await settle();
    await endPhase(b);
    await settle(12000);
    expect(a.view().round).toBe(2);
    expect(a.hero().sp).toBe(10);

    await a.keys("nextUnit", "action");
    expect(a.menu()).toContain("skill (greyed)");
    expect(a.state.skillOptions().map((o) => [o.id, o.reason ?? null])).toEqual([["blast", "tactical.error.skill"], ["mega", "tactical.error.sp"]]);
    // The items of the menu (its fourth key), the ether, on the hero itself.
    await a.keys("entry4", "action", "action");
    await settle();
    expect(a.hero().sp).toBe(20);

    a.state.flee();
    await a.keys("action");
    await settle();
    await closeResult(a, b);
    expect((await result).outcome).toBe("escape");
    expect(a.player.sp).toBe(20);
    expect(a.player.removeItem).toHaveBeenCalledWith("ether", 1);
  });

  it("a potion goes to an ally next to the hero; the last one greys the items; a move and an attack in one order win", async () => {
    const { a, b, result } = await play("items", { a: { items: { potion: 1 } }, b: { items: { potion: 2 } } });
    await endPhase(a, b);
    await settle(10000);
    expect(a.view().round).toBe(2);

    // Bob gives a potion to Alice, on his left.
    const before = a.hero().hp;
    await b.keys("nextUnit", "action");
    expect(b.menu()).toEqual(["attack (greyed)", "skill (greyed)", ">item", "guard", "wait"]);
    await b.keys("action", "action", "left", "action");
    await settle();
    expect(a.hero().hp).toBe(Math.min(100, before + 40));
    expect(b.hero().items.potion).toBe(1);

    // Alice drinks her only potion.
    await a.keys("nextUnit", "action", "action", "action", "action");
    await settle(12000);
    expect(a.view().round).toBe(3);
    await a.keys("nextUnit", "action");
    expect(a.menu()).toEqual(["attack (greyed)", "skill (greyed)", "item (greyed)", ">guard", "wait"]);

    // Back to the move: two cells up, next to the post, and the attack goes with the move.
    await a.keys("escape", "up", "up", "action");
    expect(a.menu()[0]).toBe(">attack");
    await a.keys("action", "up");
    expect(a.state.forecast()).toMatchObject({ remaining: 0 });
    await a.keys("action");
    await settle();

    for (const p of [a, b]) expect(p.view().winner).toBe("ally");
    await closeResult(a, b);
    expect((await result).outcome).toBe("victory");
    expect(a.player.removeItem).toHaveBeenCalledWith("potion", 1);
    expect(b.player.removeItem).toHaveBeenCalledWith("potion", 1);
  });

  it("a partner who leaves hands their units over; the battle goes on to a defeat, written on the one who stayed", async () => {
    const { a, b, result, leave } = await play("doom");
    await leave(b);
    await settle(0);
    expect(a.state.notice()).toBe("Bob left the battle: you now command their units.");
    expect(a.view().units.filter((u) => u.team === "ally").every((u) => u.owner === a.player.id)).toBe(true);

    await endPhase(a);
    await settle(15000);
    expect(a.view().winner).toBe("enemy");
    await closeResult(a);
    expect((await result).outcome).toBe("defeat");
    // HP is written as at least 1; nothing for the player who left.
    expect(a.player.hp).toBe(1);
    expect(b.player.hp).toBe(100);
  });
});

describe("duel: one player against the other", () => {
  it("is played to the KO; the forecast against a hero on guard is what it takes; nothing is written on the players", async () => {
    const { a, b, result } = await play("arena", { duel: true });
    // Alice walks up two cells and guards, Bob walks down two cells and guards.
    await a.keys("nextUnit", "up", "up", "action", "entry5");
    await settle();
    await b.keys("nextUnit", "down", "down", "action", "entry5");
    await settle();
    // Alice steps next to Bob and attacks: he is on guard, he takes half.
    await a.keys("nextUnit", "up", "action");
    expect(a.menu()[0]).toBe(">attack");
    await a.keys("action", "up");
    const forecast = a.state.forecast()!;
    expect(forecast.target.guarding).toBe(true);
    await a.keys("action");
    await settle();
    expect(b.hero().hp).toBe(100 - forecast.amount);
    expect(forecast.amount).toBe(Math.ceil(a.hero().power / 2));

    for (let i = 0; i < 20 && !a.view().winner; i++) {
      await b.keys("nextUnit", "action", "action", "down", "action");
      await settle();
      if (a.view().winner) break;
      await a.keys("nextUnit", "action", "action", "up", "action");
      await settle();
    }
    const winner = a.view().winner;
    expect(winner).toBeTruthy();
    expect(b.view().winner).toBe(winner);
    await closeResult(a, b);
    const end = await result;
    expect(end.winners).toEqual([winner === "ally" ? a.player.id : b.player.id]);
    expect([a.player.hp, b.player.hp]).toEqual([100, 100]);
  });

  it("a rival who leaves loses by forfeit, and is not announced as a partner", async () => {
    const { a, b, result, leave } = await play("arena", { duel: true });
    await leave(b);
    await settle();
    expect(a.state.notice()).toBe("Bob left the battle.");
    expect(a.view().winner).toBe("ally");
    expect(a.state.lastSurrender()).toBe("Bob left the battle.");
    await closeResult(a);
    expect((await result).outcome).toBe("victory");
    expect(a.player.hp).toBe(100);
  });
});
