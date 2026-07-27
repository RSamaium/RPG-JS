import { afterEach, describe, expect, test, vi } from "vitest";
import {
  executeActionBattleUse,
  handleActionBattleProjectileImpact,
} from "./action-use";
import { setActionBattleSystems } from "./context";
import {
  beginActionBattleGuard,
  clearActionBattleDefense,
} from "./defense";

const createEntity = (id: string, hp = 100) => ({
  id,
  hp,
  sp: 100,
  param: { maxhp: hp },
  x: () => 0,
  y: () => 0,
  knockback: vi.fn(),
  applyStates: vi.fn(),
  applyDamage: vi.fn(),
  setGraphicAnimation: vi.fn(),
  flash: vi.fn(),
  showHit: vi.fn(),
});

describe("executeActionBattleUse", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setActionBattleSystems({});
  });

  test("applies the standard skill effect when no onUse hook is defined", () => {
    const attacker = createEntity("caster");
    const target = createEntity("target");
    target.applyDamage.mockReturnValue({ damage: 25 });

    const handled = executeActionBattleUse({
      attacker: attacker as any,
      target: target as any,
      usable: {
        id: "fire",
        _type: "skill",
        spCost: 10,
        hitRate: 1,
      },
      skill: {
        id: "fire",
        _type: "skill",
        spCost: 10,
        hitRate: 1,
      },
    });

    expect(handled).toBe(true);
    expect(attacker.sp).toBe(90);
    expect(attacker.applyStates).toHaveBeenCalled();
    expect(target.applyDamage).toHaveBeenCalledWith(attacker, expect.objectContaining({ id: "fire" }));
  });

  test("consumes SP and resolves a failed skill without basic damage", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const attacker = {
      ...createEntity("caster"),
      getCurrentMap: () => ({
        clientVisual: vi.fn(),
      }),
    };
    const target = createEntity("target");

    const handled = executeActionBattleUse({
      attacker: attacker as any,
      target: target as any,
      usable: {
        id: "risky",
        _type: "skill",
        spCost: 5,
        hitRate: 0.95,
      },
      skill: {
        id: "risky",
        _type: "skill",
        spCost: 5,
        hitRate: 0.95,
      },
    });

    expect(handled).toBe(true);
    expect(attacker.sp).toBe(95);
    expect(target.applyDamage).not.toHaveBeenCalled();
  });

  test("parries skill damage before states and staggers the attacking AI", () => {
    const clientVisual = vi.fn();
    const stagger = vi.fn();
    const attacker = {
      ...createEntity("monster"),
      battleAi: { stagger },
      getCurrentMap: () => ({ clientVisual }),
    };
    const target = {
      ...createEntity("hero"),
      direction: "up",
    };
    beginActionBattleGuard(target, { parryWindowMs: 200 });

    executeActionBattleUse({
      attacker: attacker as any,
      target: target as any,
      usable: {
        id: "claw",
        _type: "skill",
        spCost: 0,
        hitRate: 1,
      },
      skill: {
        id: "claw",
        _type: "skill",
        spCost: 0,
        hitRate: 1,
      },
    });

    expect(target.applyDamage).not.toHaveBeenCalled();
    expect(attacker.applyStates).not.toHaveBeenCalled();
    expect(stagger).toHaveBeenCalledWith(650, target);
    expect(clientVisual).toHaveBeenCalledWith(
      "action-battle.visual",
      expect.objectContaining({ moment: "parry" })
    );
    clearActionBattleDefense(target);
  });

  test("lets onUse compose custom behavior with defaultEffect", () => {
    const attacker = createEntity("caster");
    const target = createEntity("target");
    target.applyDamage.mockReturnValue({ damage: 18 });
    const onUse = vi.fn((_user, _target, action) => {
      action.defaultEffect();
      action.heal(_user, 5);
    });

    executeActionBattleUse({
      attacker: attacker as any,
      target: target as any,
      usable: {
        id: "drain",
        _type: "skill",
        spCost: 4,
        hitRate: 1,
        onUse,
      },
      skill: {
        id: "drain",
        _type: "skill",
        spCost: 4,
        hitRate: 1,
        onUse,
      },
    });

    expect(onUse).toHaveBeenCalledOnce();
    expect(attacker.sp).toBe(96);
    expect(target.applyDamage).toHaveBeenCalledOnce();
  });

  test("applies default effects to action target arrays", () => {
    const attacker = createEntity("caster");
    const first = createEntity("first");
    const second = createEntity("second");
    first.applyDamage.mockReturnValue({ damage: 11 });
    second.applyDamage.mockReturnValue({ damage: 12 });

    executeActionBattleUse({
      attacker: attacker as any,
      target: [first as any, second as any],
      usable: {
        id: "burst",
        _type: "skill",
        spCost: 3,
        hitRate: 1,
      },
      skill: {
        id: "burst",
        _type: "skill",
        spCost: 3,
        hitRate: 1,
      },
    });

    expect(first.applyDamage).toHaveBeenCalledOnce();
    expect(second.applyDamage).toHaveBeenCalledOnce();
  });

  test("supports full custom heal skills without default damage", () => {
    const attacker = createEntity("healer");
    const target = createEntity("ally", 40);
    target.hp = 10;

    executeActionBattleUse({
      attacker: attacker as any,
      target: target as any,
      usable: {
        id: "heal",
        _type: "skill",
        spCost: 8,
        hitRate: 1,
        onUse(_user: any, ally: any, action: any) {
          action.heal(ally, 20);
        },
      },
      skill: {
        id: "heal",
        _type: "skill",
        spCost: 8,
        hitRate: 1,
      },
    });

    expect(attacker.sp).toBe(92);
    expect(target.hp).toBe(30);
    expect(target.applyDamage).not.toHaveBeenCalled();
  });

  test("applies the standard weapon effect for configured weapons", () => {
    const attacker = createEntity("monster");
    const target = createEntity("target");
    target.applyDamage.mockReturnValue({ damage: 12 });

    const handled = executeActionBattleUse({
      attacker: attacker as any,
      target: target as any,
      usable: {
        id: "claw",
        _type: "weapon",
        action: { mode: "instant", range: 40 },
      },
      weapon: {
        id: "claw",
        _type: "weapon",
      },
    });

    expect(handled).toBe(true);
    expect(target.applyDamage).toHaveBeenCalledWith(attacker, undefined);
  });

  test("defers the default effect until projectile impact", () => {
    const target = createEntity("target");
    target.applyDamage.mockReturnValue({ damage: 30 });
    const emitted = [{ id: "bolt-1" }];
    const emit = vi.fn(() => emitted);
    const attacker = {
      ...createEntity("caster"),
      getCurrentMap: () => ({
        projectiles: {
          emit,
        },
      }),
    };

    executeActionBattleUse({
      attacker: attacker as any,
      target: target as any,
      usable: {
        id: "bolt",
        _type: "skill",
        spCost: 5,
        hitRate: 1,
        action: {
          mode: "projectile",
          range: 200,
          visual: {
            trailFx: "torchFire",
          },
          projectile: {
            type: "bolt",
            speed: 200,
            range: 200,
          },
        },
      },
      skill: {
        id: "bolt",
        _type: "skill",
        spCost: 5,
        hitRate: 1,
      },
    });

    expect(target.applyDamage).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ trailFx: "torchFire" }),
      }),
      attacker
    );

    handleActionBattleProjectileImpact({
      attacker: attacker as any,
      target: target as any,
      projectile: { id: "bolt-1" },
      hit: {},
      map: {},
    });

    expect(target.applyDamage).toHaveBeenCalledOnce();
  });

  test("uses the action target policy for projectile collisions", () => {
    const enemy = createEntity("enemy");
    (enemy as any).actionBattleFaction = "enemy";
    const ally = createEntity("ally");
    (ally as any).actionBattleFaction = "party";
    const emit = vi.fn(() => [{ id: "heal-bolt-1" }]);
    const attacker = {
      ...createEntity("caster"),
      actionBattleFaction: "party",
      getCurrentMap: () => ({
        projectiles: {
          emit,
        },
      }),
    };

    executeActionBattleUse({
      attacker: attacker as any,
      target: ally as any,
      usable: {
        id: "heal-bolt",
        _type: "skill",
        spCost: 5,
        hitRate: 1,
        action: {
          mode: "projectile",
          target: "ally",
          range: 200,
          projectile: {
            type: "heal",
            speed: 200,
          },
        },
      },
      skill: {
        id: "heal-bolt",
        _type: "skill",
        spCost: 5,
        hitRate: 1,
      },
    });

    const canHit = emit.mock.calls[0][0].canHit;
    expect(canHit({ target: ally })).toBe(true);
    expect(canHit({ target: enemy })).toBe(false);
  });

  test("passes projectile precision options to the generic projectile system", () => {
    const emit = vi.fn(() => [{ id: "bolt-1" }]);
    const attacker = {
      ...createEntity("caster"),
      getCurrentMap: () => ({
        projectiles: {
          emit,
        },
      }),
    };
    const target = {
      ...createEntity("target"),
      x: () => 100,
      y: () => 0,
    };

    executeActionBattleUse({
      attacker: attacker as any,
      target: target as any,
      usable: {
        id: "bolt",
        _type: "skill",
        spCost: 0,
        hitRate: 1,
        action: {
          mode: "projectile",
          projectile: {
            type: "bolt",
            speed: 200,
            range: 200,
            spreadDegrees: 20,
          },
        },
      },
      skill: {
        id: "bolt",
        _type: "skill",
        spCost: 0,
        hitRate: 1,
      },
    });

    expect(emit.mock.calls[0][0]).toMatchObject({
      direction: { x: 1, y: 0 },
      spreadDegrees: 20,
    });
  });

  test("uses the built-in projectile and serializes Studio presentation", () => {
    const emit = vi.fn(() => [{ id: "studio-bolt-1" }]);
    const attacker = {
      ...createEntity("caster"),
      getCurrentMap: () => ({
        tileWidth: 48,
        projectiles: { emit },
      }),
    };

    executeActionBattleUse({
      attacker: attacker as any,
      usable: {
        id: "studio-bolt",
        _type: "skill",
        spCost: 0,
        targeting: { range: 6 },
        action: {
          mode: "projectile",
          projectile: {
            graphic: "fireball-spritesheet",
            scale: 1.4,
            rotateToDirection: false,
          },
        },
      },
      skill: {
        id: "studio-bolt",
        _type: "skill",
        spCost: 0,
        targeting: { range: 6 },
      },
    });

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "action-battle-skill",
        trajectory: {
          type: "linear",
          speed: 180,
          range: 288,
        },
        params: {
          graphic: "fireball-spritesheet",
          scale: 1.4,
          rotateToDirection: false,
        },
      }),
      attacker,
    );
  });
});
