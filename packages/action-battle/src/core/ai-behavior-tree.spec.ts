import { describe, expect, expectTypeOf, test, vi } from "vitest";
import { AiState, AttackPattern, EnemyType } from "../ai.server";
import {
  action,
  chase,
  condition,
  cooldown,
  defineAiBehavior,
  hpBelow,
  ifHpBelow,
  ifTargetInRange,
  keepDistance,
  once,
  phase,
  selector,
  sequence,
  sequenceWithDelay,
  targetInRange,
  useAttack,
  visual,
  wait,
} from "./ai-behavior-tree";

const createContext = (overrides: Record<string, any> = {}) => {
  const event = { id: "enemy-1" };
  const target = { id: "player-1" };
  const distance = overrides.distance ?? 40;
  return {
    event,
    target,
    state: AiState.Combat,
    enemyType: EnemyType.Aggressive,
    distance,
    hpPercent: overrides.hpPercent ?? 0.8,
    now: 100,
    self: {
      event,
      state: AiState.Combat,
      enemyType: EnemyType.Aggressive,
      hpPercent: overrides.hpPercent ?? 0.8,
      attackRange: overrides.attackRange ?? 50,
    },
    targetInfo: overrides.targetInfo ?? {
      entity: target,
      distance,
      inAttackRange: distance <= (overrides.attackRange ?? 50),
      visible: true,
    },
    memory: {},
    ...overrides,
  } as any;
};

describe("action battle AI behavior tree", () => {
  test("selects the first successful branch", () => {
    const tree = selector([
      sequence([condition(hpBelow(0.2)), action(chase())]),
      sequence([condition(targetInRange()), action(useAttack(AttackPattern.Melee))]),
      action(keepDistance(80)),
    ]);

    const result = tree.tick(createContext());

    expect(result.status).toBe("success");
    expect(result.intent).toEqual({
      type: "useAttack",
      pattern: AttackPattern.Melee,
    });
  });

  test("compiles simplified rules to a behavior tree", () => {
    const behavior = defineAiBehavior({
      when: [
        ifHpBelow(0.25, keepDistance(120)),
        ifTargetInRange(useAttack("melee")),
      ],
      otherwise: chase(),
    });

    expect(behavior.tick(createContext({ hpPercent: 0.1 })).intent).toEqual({
      type: "keepDistance",
      distance: 120,
      tolerance: undefined,
    });
    expect(behavior.tick(createContext({ distance: 30 })).intent).toEqual({
      type: "useAttack",
      pattern: "melee",
    });
    expect(behavior.tick(createContext({ distance: 90 })).intent).toEqual({
      type: "moveToTarget",
    });
  });

  test("supports dynamic actions with memory", () => {
    const behavior = defineAiBehavior({
      otherwise: ({ memory }) => {
        memory.ticks = (memory.ticks ?? 0) + 1;
        return useAttack(memory.ticks === 1 ? "melee" : "dashAttack");
      },
    });
    const context = createContext();

    expect(behavior.tick(context).intent).toEqual({
      type: "useAttack",
      pattern: "melee",
    });
    expect(behavior.tick(context).intent).toEqual({
      type: "useAttack",
      pattern: "dashAttack",
    });
  });

  test("does not evaluate later selector branches after success", () => {
    const later = vi.fn(() => ({ status: "success" as const, intent: chase() }));
    const tree = selector([action(useAttack("melee")), later]);

    const result = tree.tick(createContext());

    expect(result.intent).toEqual({ type: "useAttack", pattern: "melee" });
    expect(later).not.toHaveBeenCalled();
  });

  test("runs named actions once per AI memory", () => {
    const node = once("rage", useAttack("charged"));
    const firstContext = createContext();
    const secondContext = createContext();

    expect(node.tick(firstContext)).toEqual({
      status: "success",
      intent: useAttack("charged"),
    });
    expect(node.tick(firstContext)).toEqual({ status: "failure" });
    expect(node.tick(secondContext).status).toBe("success");
  });

  test("starts a named cooldown only after action success", () => {
    const node = cooldown("shout", 100, visual({ kind: "bubble", text: "!" }));
    const context = createContext({ now: 100 });

    expect(node.tick(context).status).toBe("success");
    context.now = 199;
    expect(node.tick(context)).toEqual({ status: "failure" });
    context.now = 200;
    expect(node.tick(context).status).toBe("success");
  });

  test("runs delayed sequences without replaying completed intents", () => {
    const node = sequenceWithDelay("combo", [
      visual({ kind: "charge" }),
      wait(50),
      useAttack("charged"),
    ]);
    const context = createContext({ now: 100 });

    expect(node.tick(context)).toEqual({
      status: "running",
      intent: visual({ kind: "charge" }),
    });
    context.now = 110;
    expect(node.tick(context)).toEqual({ status: "running" });
    context.now = 159;
    expect(node.tick(context)).toEqual({ status: "running" });
    context.now = 160;
    expect(node.tick(context)).toEqual({
      status: "success",
      intent: useAttack("charged"),
    });
  });

  test("completes an HP phase once after its delayed sequence", () => {
    const node = phase(
      "rage",
      0.5,
      sequenceWithDelay("rage-steps", [
        visual({ kind: "rage" }),
        wait(10),
        useAttack("dashAttack"),
      ])
    );
    const context = createContext({ hpPercent: 0.4, now: 0 });

    expect(node.tick(context).status).toBe("running");
    context.now = 1;
    expect(node.tick(context).status).toBe("running");
    context.now = 11;
    expect(node.tick(context).status).toBe("success");
    expect(node.tick(context)).toEqual({ status: "failure" });
  });

  test("keeps visual cue payloads JSON-shaped", () => {
    const cue = visual({
      kind: "ground-marker",
      durationMs: 900,
      position: { x: 12, y: 24 },
    });

    expectTypeOf(cue.visual.kind).toEqualTypeOf<string>();
    expect(cue.consume).toBe(false);
  });
});
