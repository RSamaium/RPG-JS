// The client loads canvasengine, which reads `window`, and battler images: a minimal browser is enough here.
vi.hoisted(() => {
  const target = globalThis as Record<string, any>;
  target.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {} });
  target.navigator ??= { getGamepads: () => [] };
  target.requestAnimationFrame ??= (cb: (now: number) => void) => setTimeout(() => cb(performance.now()), 16);
  target.cancelAnimationFrame ??= (id: number) => clearTimeout(id);
  // An image that loads at once (the client packages may install one that never does).
  target.Image = class {
    naturalWidth = 128;
    naturalHeight = 128;
    crossOrigin = "";
    onload: () => void = () => {};
    onerror: () => void = () => {};
    set src(_value: string) {
      setTimeout(() => this.onload(), 0);
    }
  };
});
import { describe, it, expect, vi, afterEach } from "vitest";
import { play, until, frames, type Side } from "./scenario-harness";

/**
 * Scenarios played by two players with the keyboard, as in the game: a real battle on the server and the battle
 * screen of each player. They check what each player sees and what is written on the players at the end.
 */
afterEach(() => vi.useRealTimers());

type Battle = Awaited<ReturnType<typeof play>>;

/** Waits until a player has to choose (their menu is open), or the battle is over. */
async function nextTurn({ a, b }: Battle) {
  await until(() => [a, b].some((s) => s.state.phase() === "command" || s.state.phase() === "result"));
  return [a, b].find((s) => s.state.phase() === "command") ?? null;
}
/** Moves the focus of the menu down to an entry, as the player does with the arrows, then confirms it. */
async function choose(side: Side, id: string) {
  for (let i = 0; i < 10 && side.state.menuEntries()[side.state.menuIndex()]?.id !== id; i++) await side.press("down");
  expect(side.state.menuEntries()[side.state.menuIndex()]?.id).toBe(id);
  await side.press("action");
}
/** Each player attacks the first enemy on their turn until the battle is over. */
async function fightToEnd(battle: Battle) {
  for (let i = 0; i < 60; i++) {
    const side = await nextTurn(battle);
    if (!side) break;
    await choose(side, "attack");
    await side.press("action");
  }
  await until(() => battle.a.state.phase() === "result" || battle.b.state.phase() === "result");
}
/** Every player still in the battle confirms the result screen: the battle resolves. */
async function closeResult(...sides: Side[]) {
  for (const s of sides) await s.press("action");
  await frames(1000);
}

describe("co-op: two players against a troop", () => {
  it("each player commands their own hero while the other one waits for them, to a victory written on both", async () => {
    const battle = await play();
    const { a, b, result } = battle;
    const first = (await nextTurn(battle))!;
    const waiting = first === a ? b : a;
    expect(first.menu()).toEqual([">attack", "skills", "guard", "items", "escape"]);
    expect(waiting.state.phase()).toBe("waiting");
    expect(waiting.state.waitingFor()).toEqual({ unit: first.player.name, player: first.player.name });

    // The attack aims at the first enemy standing, then goes.
    await first.press("action");
    expect(first.state.phase()).toBe("target");
    expect(first.state.targetName()).toBe("Gobelin A");
    await first.press("action");
    expect(first.state.phase()).toBe("playing");

    await fightToEnd(battle);
    for (const s of [a, b]) {
      expect(s.state.phase()).toBe("result");
      expect(s.state.result()?.outcome).toBe("victory");
    }
    const exp = a.state.result()!.exp;
    expect(exp).toBeGreaterThan(0);
    expect([a.player.exp, b.player.exp]).toEqual([exp, exp]);
    await closeResult(a, b);
    expect((await result).outcome).toBe("victory");
  });

  it("the skills open on one that can be used, the arrows skip the others, a click on one too expensive says why; the SP spent are written on the player", async () => {
    const battle = await play({ a: { skills: ["ultima", "slash"] } });
    const { a, b } = battle;
    let side = await nextTurn(battle);
    while (side && side !== a) {
      await choose(side, "guard");
      side = await nextTurn(battle);
    }
    await choose(a, "skills");
    expect(a.menu()).toEqual(["ultima (greyed)", ">slash"]);
    await a.press("down");
    expect(a.menu()).toEqual(["ultima (greyed)", ">slash"]);
    // A click (pointer) on the greyed one.
    a.session.chooseEntry(0);
    expect(a.state.toast()?.text).toBe("Not enough MP");
    expect(a.state.phase()).toBe("command");
    await a.press("action");
    expect(a.state.phase()).toBe("target");
    await a.press("action");
    await until(() => a.hero().sp === 10);

    await fightToEnd(battle);
    expect(a.state.result()?.outcome).toBe("victory");
    expect(a.player.sp).toBe(a.latest().combatants.find((c) => c.id === `player:${a.player.id}`)!.sp);
    expect(a.player.sp).toBeLessThan(20);
    await closeResult(a, b);
  });

  it("a potion goes to the partner the player picks, and the item spent leaves their bag", async () => {
    const battle = await play({ a: { items: { potion: 1 } } });
    const { a, b } = battle;
    let side = await nextTurn(battle);
    while (side && side !== a) {
      await choose(side, "guard");
      side = await nextTurn(battle);
    }
    await choose(a, "items");
    expect(a.menu()).toEqual([">potion"]);
    await a.press("action");
    expect(a.state.phase()).toBe("target");
    // From Alice to Bob, with the arrows.
    for (let i = 0; i < 3 && a.state.targetName() !== "Bob"; i++) await a.press("right");
    expect(a.state.targetName()).toBe("Bob");
    const before = b.hero().hp;
    await a.press("action");
    await until(() => b.hero().hp > before);
    expect(b.hero().hp).toBe(Math.min(b.hero().stats.maxHp, before + 100));

    await fightToEnd(battle);
    await closeResult(a, b);
    expect(a.player.removeItem).toHaveBeenCalledWith("potion", 1);
    expect(b.player.removeItem).not.toHaveBeenCalled();
  });

  it("an effect of the game that fails is skipped: both screens go on to the end of the battle", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    // Every effect the battle plays throws.
    const fx = new Proxy({}, { get: () => () => { throw new Error("boom"); } });
    const battle = await play({ client: { fx } });
    const { a, b, result } = battle;
    await fightToEnd(battle);
    for (const s of [a, b]) expect(s.state.result()?.outcome).toBe("victory");
    expect(errors).toHaveBeenCalled();
    // Nothing stayed where an animation stopped: every battler is home, the fallen ones lie as fallen.
    for (const s of [a, b])
      for (const battler of s.scene.battlers()) {
        expect([battler.id, Math.abs(battler.offX()), Math.abs(battler.offY())]).toEqual([battler.id, 0, 0]);
        expect(battler.dead()).toBe(battler.hp() <= 0);
      }
    await closeResult(a, b);
    expect((await result).outcome).toBe("victory");
    errors.mockRestore();
  });

  it("the heroes escape: both screens end the battle", async () => {
    const battle = await play();
    const { a, b, result } = battle;
    const side = (await nextTurn(battle))!;
    await choose(side, "escape");
    await until(() => a.state.phase() === "result" && b.state.phase() === "result");
    expect([a.state.result()?.outcome, b.state.result()?.outcome]).toEqual(["escape", "escape"]);
    await closeResult(a, b);
    expect((await result).outcome).toBe("escape");
  });

  it("a partner who disconnects leaves their hero to the AI: the other one plays on alone, and only they get the reward", async () => {
    const battle = await play();
    const { a, b, disconnect, result } = battle;
    await nextTurn(battle);
    disconnect(b);
    for (let i = 0; i < 60; i++) {
      const side = await nextTurn(battle);
      if (!side) break;
      // Bob's hero is played by the AI: Alice never waits for him.
      expect(side).toBe(a);
      await choose(a, "attack");
      await a.press("action");
    }
    await until(() => a.state.phase() === "result");
    expect(a.state.result()?.outcome).toBe("victory");
    expect(b.player.exp).toBe(0);
    await closeResult(a);
    expect((await result).outcome).toBe("victory");
  });

  it("a player who lets the turn timer run out guards; their partner sees the countdown too", async () => {
    const battle = await play({ turnTimer: 5 });
    const { a, b } = battle;
    const side = (await nextTurn(battle))!;
    const other = side === a ? b : a;
    expect(side.state.countdown()).toBe(5);
    expect(other.state.countdown()).toBe(5);
    const revision = side.latest().revision;
    await frames(6000);
    const next = side.packets.find((p) => p.revision === revision + 1)!;
    expect(next.beats[0]).toMatchObject({ t: "guard", actor: `player:${side.player.id}` });
  });

  it("the heroes fall: both screens show the defeat, and the players keep at least 1 HP", async () => {
    const battle = await play({ troop: "ogre" });
    const { a, b, result } = battle;
    await fightToEnd(battle);
    for (const s of [a, b]) expect(s.state.result()?.outcome).toBe("defeat");
    expect(a.player.hp).toBeGreaterThanOrEqual(1);
    expect(b.player.hp).toBeGreaterThanOrEqual(1);
    await closeResult(a, b);
    expect((await result).outcome).toBe("defeat");
  });
});

describe("duel: one player against the other", () => {
  it("offers to surrender instead of escaping; the second press gives up, with opposite results and no HP written", async () => {
    const battle = await play({ duel: true });
    const { a, b, result } = battle;
    const side = (await nextTurn(battle))!;
    const rival = side === a ? b : a;
    expect(side.menu()).toEqual([">attack", "skills", "guard", "items", "surrender"]);
    await choose(side, "surrender");
    // A first press only arms it.
    expect(side.state.menuEntries().find((e) => e.id === "surrender")?.label).toBe("Confirm surrender?");
    expect(side.state.phase()).toBe("command");
    await side.press("action");
    await until(() => a.state.phase() === "result" && b.state.phase() === "result");
    expect(side.state.result()?.outcome).toBe("defeat");
    expect(rival.state.result()?.outcome).toBe("victory");
    expect([a.player.hp, b.player.hp]).toEqual([300, 300]);
    await closeResult(a, b);
    expect((await result).winners).toEqual([rival.player.id]);
  });

  it("is fought to the end with attacks: one screen shows the victory, the other the defeat", async () => {
    const battle = await play({ duel: true });
    const { a, b } = battle;
    for (let i = 0; i < 80; i++) {
      const side = await nextTurn(battle);
      if (!side) break;
      await choose(side, "attack");
      await side.press("action");
    }
    await until(() => a.state.phase() === "result" && b.state.phase() === "result");
    expect([a.state.result()?.outcome, b.state.result()?.outcome].sort()).toEqual(["defeat", "victory"]);
    expect([a.player.hp, b.player.hp]).toEqual([300, 300]);
    await closeResult(a, b);
  });

  it("a rival who disconnects loses: the other screen shows the victory", async () => {
    const battle = await play({ duel: true });
    const { a, b, disconnect, result } = battle;
    await nextTurn(battle);
    disconnect(b);
    await until(() => a.state.phase() === "result");
    expect(a.state.result()?.outcome).toBe("victory");
    await closeResult(a);
    expect((await result).outcome).toBe("victory");
  });
});
