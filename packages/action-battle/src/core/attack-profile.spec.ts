import { describe, expect, test } from "vitest";
import {
  DEFAULT_ACTION_BATTLE_ATTACK_PROFILE,
  normalizeActionBattleAttackProfile,
} from "./attack-profile";
import { normalizeActionBattleOptions } from "../config";
import type { NormalizedActionBattleAttackProfile } from "../types";

describe("normalizeActionBattleAttackProfile", () => {
  test("creates a default profile compatible with the legacy 350ms attack lock", () => {
    const profile = normalizeActionBattleAttackProfile();

    expect(profile).toEqual(DEFAULT_ACTION_BATTLE_ATTACK_PROFILE);
    expect(profile.control).toEqual({
      movementLock: "full",
      directionLock: "full",
      moveCancelsRecovery: false,
      dodgeCancelsRecovery: true,
      inputBufferMs: 140,
    });
  });

  test("normalizes responsive active-frame control locks", () => {
    const profile = normalizeActionBattleAttackProfile({
      startupMs: 50,
      activeMs: 100,
      recoveryMs: 200,
      control: {
        movementLock: "active",
        directionLock: "none",
        moveCancelsRecovery: true,
        inputBufferMs: 160,
      },
    });

    expect(profile.control).toMatchObject({
      movementLock: "active",
      directionLock: "none",
      moveCancelsRecovery: true,
      inputBufferMs: 160,
    });
  });

  test("derives recovery from the legacy lock duration when recovery is omitted", () => {
    const profile = normalizeActionBattleAttackProfile(
      {
        startupMs: 80,
        activeMs: 90,
      },
      {
        lockDurationMs: 400,
      }
    );

    expect(profile.recoveryMs).toBe(230);
    expect(profile.totalDurationMs).toBe(400);
    expect(profile.cooldownMs).toBe(400);
  });

  test("keeps explicit timing, movement, hit policy, animation, and hitboxes", () => {
    const hitboxes = {
      right: { offsetX: 18, offsetY: -18, width: 42, height: 36 },
    };
    const profile = normalizeActionBattleAttackProfile({
      id: "heavy-sword",
      startupMs: 140,
      activeMs: 100,
      recoveryMs: 260,
      cooldownMs: 650,
      movementLock: false,
      directionLock: false,
      animationKey: "castSkill",
      hitPolicy: "allowRepeatHits",
      damageMultiplier: 2.2,
      knockbackMultiplier: 1.8,
      hitboxes,
    });

    expect(profile).toMatchObject({
      id: "heavy-sword",
      startupMs: 140,
      activeMs: 100,
      recoveryMs: 260,
      cooldownMs: 650,
      movementLock: false,
      directionLock: false,
      animationKey: "castSkill",
      hitPolicy: "allowRepeatHits",
      damageMultiplier: 2.2,
      knockbackMultiplier: 1.8,
      totalDurationMs: 500,
    });
    expect(profile.hitboxes).toBe(hitboxes);
  });

  test("normalizes unsafe timing values to playable bounds", () => {
    const profile = normalizeActionBattleAttackProfile({
      startupMs: -20,
      activeMs: 0,
      recoveryMs: -10,
      cooldownMs: -1,
    });

    expect(profile.startupMs).toBe(0);
    expect(profile.activeMs).toBe(1);
    expect(profile.recoveryMs).toBe(0);
    expect(profile.cooldownMs).toBe(0);
    expect(profile.totalDurationMs).toBe(1);
  });

  test("normalizes attack.profile through action battle options", () => {
    const options = normalizeActionBattleOptions({
      attack: {
        lockMovement: false,
        lockDurationMs: 300,
        profile: {
          id: "quick-slash",
          startupMs: 60,
          activeMs: 80,
        },
      },
    });
    const profile = options.attack
      ?.profile as NormalizedActionBattleAttackProfile;

    expect(profile).toMatchObject({
      id: "quick-slash",
      startupMs: 60,
      activeMs: 80,
      recoveryMs: 160,
      cooldownMs: 300,
      movementLock: false,
      totalDurationMs: 300,
    });
  });

  test("enables Adventure combat and impact visuals by default with a classic escape hatch", () => {
    const adventure = normalizeActionBattleOptions();
    const classic = normalizeActionBattleOptions({ preset: "classic" });

    expect(adventure.preset).toBe("adventure");
    expect((adventure.combat?.player?.combo as any).enabled).toBe(true);
    expect((adventure.combat?.player?.chargedAttack as any).control).toBe("e");
    expect((adventure.combat?.player?.dodge as any).invincibilityMs).toBe(220);
    expect((adventure.combat?.player?.guard as any).enabled).toBe(true);
    expect((adventure.combat?.player?.softTargeting as any).enabled).toBe(true);
    expect(
      (adventure.attack?.profile as NormalizedActionBattleAttackProfile).control
    ).toMatchObject({
      movementLock: "active",
      directionLock: "active",
      inputBufferMs: 160,
    });
    expect(adventure.ui).not.toHaveProperty("health");
    expect(adventure.visual).toBe("impact");

    expect(classic.preset).toBe("classic");
    expect(classic.combat?.player?.combo).toBe(false);
    expect(classic.combat?.player?.guard).toBe(false);
    expect(classic.combat?.player?.softTargeting).toBe(false);
    expect(classic.visual).toBe("classic");
  });

  test("merges partial Adventure player features and supports boolean toggles", () => {
    const options = normalizeActionBattleOptions({
      combat: {
        player: {
          combo: { bufferMs: 220 },
          chargedAttack: false,
          dodge: true,
        },
      },
    });

    expect(options.combat?.player?.combo).toMatchObject({
      enabled: true,
      bufferMs: 220,
      resetMs: 700,
    });
    expect(options.combat?.player?.chargedAttack).toBe(false);
    expect(options.combat?.player?.dodge).toMatchObject({
      enabled: true,
      cooldownMs: 650,
      invincibilityMs: 220,
    });
  });

  test("keeps legacy lockDurationMs when no explicit profile is provided", () => {
    const options = normalizeActionBattleOptions({
      attack: {
        lockDurationMs: 500,
      },
    });
    const profile = options.attack
      ?.profile as NormalizedActionBattleAttackProfile;

    expect(profile.totalDurationMs).toBe(500);
    expect(profile.recoveryMs).toBe(380);
    expect(profile.cooldownMs).toBe(500);
  });

  test("normalizes the new combat, ai, skills, and ui option shape", () => {
    const damage = () => ({ damage: 1, defeated: false });
    const behavior = () => ({ mode: "assault" as const });
    const targeting = () => ({ range: 4, aoeMask: ["#"] });
    const options = normalizeActionBattleOptions({
      attack: {
        lockDurationMs: 500,
      },
      systems: {
        combat: {
          damage: () => ({ damage: 0, defeated: false }),
        },
      },
      combat: {
        attack: {
          lockDurationMs: 260,
        },
        damage,
      },
      ai: {
        behaviors: {
          slime: behavior,
        },
      },
      skills: {
        targeting,
      },
      ui: {
        hotbar: true,
        targeting: false,
        attackPreview: false,
      },
    });

    expect(options.attack?.lockDurationMs).toBe(260);
    expect(options.systems?.combat?.damage).toBe(damage);
    expect(options.combat?.damage).toBe(damage);
    expect(options.systems?.ai?.behaviors?.slime).toBe(behavior);
    expect(options.ai?.behaviors?.slime).toBe(behavior);
    expect(options.skills?.getTargeting).toBe(targeting);
    expect(options.skills?.targeting).toBe(targeting);
    expect((options.ui?.hotbar as any).enabled).toBe(true);
    expect((options.ui?.targeting as any).enabled).toBe(false);
    expect((options.ui?.attackPreview as any).enabled).toBe(false);
  });
});
