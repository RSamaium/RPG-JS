import { afterEach, describe, expect, test, vi } from "vitest";
import { applyActionBattleEntityHit } from "./server";
import { setActionBattleSystems } from "./core/context";
import { beginActionBattleGuard, clearActionBattleDefense } from "./core/defense";

// RSamaium/RPG-JS#423: a player hit by a player (no battleAi) got no hurt feedback.
const createPlayer = (id: string, packets: any[]) => ({
  id,
  hp: 100,
  sp: 100,
  param: { maxhp: 100 },
  x: () => 0,
  y: () => 0,
  knockback: vi.fn(),
  applyStates: vi.fn(),
  applyDamage: vi.fn(() => ({ damage: 30 })),
  setGraphicAnimation: vi.fn(),
  flash: vi.fn(),
  showHit: vi.fn(),
  getCurrentMap: () => ({
    clientVisual: (_id: string, payload: any) => packets.push(structuredClone(payload)),
  }),
});

const hurtPackets = (packets: any[]) => packets.filter((packet) => packet.moment === "hurt");

describe("applyActionBattleEntityHit on a target without AI", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setActionBattleSystems({});
  });

  test("emits the hurt visual for the hit player, as an enemy gets it", () => {
    const packets: any[] = [];
    const attacker = createPlayer("attacker", packets);
    const target = createPlayer("target", packets);

    const result = applyActionBattleEntityHit(attacker as any, target as any, undefined, {});

    expect(result?.damage).toBe(30);
    const hurt = hurtPackets(packets);
    expect(hurt).toHaveLength(1);
    expect(hurt[0]).toMatchObject({
      moment: "hurt",
      objectId: "target",
      targetId: "target",
      sourceId: "attacker",
      damage: 30,
      defeated: false,
    });
  });

  test("emits it once, whatever the hooks given to the hit", () => {
    const packets: any[] = [];
    const attacker = createPlayer("attacker", packets);
    const target = createPlayer("target", packets);

    applyActionBattleEntityHit(attacker as any, target as any, { onAfterHit: vi.fn() } as any, {});

    expect(hurtPackets(packets)).toHaveLength(1);
  });

  test("reports a defeat in the visual", () => {
    const packets: any[] = [];
    const attacker = createPlayer("attacker", packets);
    const target = createPlayer("target", packets);
    target.hp = 20;
    target.applyDamage.mockImplementation(() => {
      target.hp -= 50;
      return { damage: 50 };
    });

    applyActionBattleEntityHit(attacker as any, target as any, undefined, {});

    expect(hurtPackets(packets)[0]).toMatchObject({ defeated: true, damage: 50 });
  });

  test("a parried hit gives the parry visual and no hurt", () => {
    const packets: any[] = [];
    const attacker = createPlayer("attacker", packets);
    const target = { ...createPlayer("target", packets), direction: "up" };
    beginActionBattleGuard(target as any, { parryWindowMs: 200 });

    applyActionBattleEntityHit(attacker as any, target as any, undefined, {});

    expect(packets.some((packet) => packet.moment === "parry")).toBe(true);
    expect(hurtPackets(packets)).toHaveLength(0);
    clearActionBattleDefense(target as any);
  });
});
