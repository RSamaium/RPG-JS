import { describe, expectTypeOf, test } from "vitest";
import type { RpgEvent } from "@rpgjs/server";
import type { ClientVisualHelpers } from "@rpgjs/client";
import {
  callAction,
  phase,
  provideActionBattle,
  sequenceWithDelay,
  teleportNearTarget,
  visual,
  wait,
  type ActionBattleAiIntent,
  type ActionBattleAiTreeNode,
  type ActionBattleAiVisual,
} from "./index";

describe("action battle public API types", () => {
  test("boss behavior helpers preserve intent and node contracts", () => {
    const cue = {
      kind: "ground-marker",
      durationMs: 900,
      position: { x: 12, y: 24 },
    } satisfies ActionBattleAiVisual;
    const sequence = sequenceWithDelay("rage", [
      visual(cue),
      wait(200),
      callAction("rage", { multiplier: 2 }),
    ]);

    expectTypeOf(visual(cue)).toEqualTypeOf<ActionBattleAiIntent>();
    expectTypeOf(teleportNearTarget({ distance: 80 }))
      .toEqualTypeOf<ActionBattleAiIntent>();
    expectTypeOf(sequence).toEqualTypeOf<ActionBattleAiTreeNode>();
    expectTypeOf(phase("rage", 0.5, sequence))
      .toEqualTypeOf<ActionBattleAiTreeNode>();
  });

  test("registered actions and visuals expose authoritative contexts", () => {
    const providers = provideActionBattle({
      ai: {
        actions: {
          rage(context, payload) {
            expectTypeOf(context.event).toEqualTypeOf<RpgEvent>();
            expectTypeOf(payload).toEqualTypeOf<
              Readonly<Record<string, unknown>> | undefined
            >();
          },
        },
        visuals: {
          rage(context, helpers) {
            expectTypeOf(context.visual).toEqualTypeOf<ActionBattleAiVisual>();
            expectTypeOf(helpers).toEqualTypeOf<ClientVisualHelpers>();
          },
        },
      },
    });

    expectTypeOf(providers).toBeArray();
  });
});
