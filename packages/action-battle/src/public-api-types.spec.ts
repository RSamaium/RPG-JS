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
  type ActionBattleAudioOptions,
  type ActionBattleUsable,
  type ActionBattleUiHotbarOptions,
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

  test("audio cues accept variants, tuning, and context resolvers", () => {
    const audio = {
      attack: ["swing-a", "swing-b"],
      hit: { id: "impact", volume: 0.7, cooldownMs: 120 },
      skill: (context) => context.skill?.sound,
      music: {
        battle: "battle-theme",
        fadeInMs: 600,
        exitDelayMs: 1500,
      },
    } satisfies ActionBattleAudioOptions;

    expectTypeOf(audio).toMatchTypeOf<ActionBattleAudioOptions>();
    expectTypeOf(provideActionBattle({ audio })).toBeArray();
  });

  test("Studio skills expose shortcuts, presentation, targeting, and projectiles", () => {
    const skill = {
      id: "fireball",
      _type: "skill",
      key: "1",
      casterAnimation: "cast",
      animation: "impact",
      sound: "cast-sound",
      impactSound: "impact-sound",
      targeting: { range: 6, aoeMask: ["010", "111", "010"] },
      action: {
        mode: "projectile",
        target: "enemy",
        cooldownMs: 800,
        visual: {
          castFx: "magicBurst",
          trailFx: "torchFire",
          impactFx: "explosionSmall",
        },
        projectile: {
          graphic: "fireball",
          speed: 240,
          scale: 1.2,
          rotateToDirection: true,
        },
      },
    } satisfies ActionBattleUsable;

    expectTypeOf(skill).toMatchTypeOf<ActionBattleUsable>();
  });

  test("hotbar resolvers receive an authoritative player", () => {
    const hotbar = {
      enabled: player => player.level > 1,
      capacity: player => player.level,
      allowedEntryTypes: player => player.level > 5 ? ["skill", "item"] : ["item"],
    } satisfies ActionBattleUiHotbarOptions;

    expectTypeOf(hotbar).toMatchTypeOf<ActionBattleUiHotbarOptions>();
  });
});
