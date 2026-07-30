import { MAXHP } from "@rpgjs/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AttackPattern, BattleAi } from "./ai.server";
import {
  callAction,
  chase,
  holdPosition,
  idle,
  ifTargetVisible,
  moveToPoint,
  run,
  setSpeed,
  teleportNearTarget,
  teleportTo,
  visual,
} from "./core/ai-behavior-tree";
import { setActionBattleSystems } from "./core/context";
import { ACTION_BATTLE_CLIENT_VISUAL_ID } from "./visual";

const createEvent = () => ({
  id: "monster-1",
  hp: 0,
  param: {
    [MAXHP]: 10,
  },
  attachShape: vi.fn(),
  flash: vi.fn(),
  showHit: vi.fn(),
  setGraphicAnimation: vi.fn(),
  mergeComponents: vi.fn(),
  componentsTop: vi.fn(() => null),
  stopMoveTo: vi.fn(),
  moveTo: vi.fn(),
  teleport: vi.fn(async () => undefined),
  speed: 4,
  getCurrentMap: vi.fn(() => ({})),
  remove: vi.fn(),
  x: vi.fn(() => 0),
  y: vi.fn(() => 0),
  direction: vi.fn(() => "down"),
  changeDirection: vi.fn(),
});

const createPlayer = () => ({
  id: "player-1",
  exp: 0,
  gold: 0,
  addItem: vi.fn(() => ({ name: () => "Potion" })),
  showNotification: vi.fn(),
  getCurrentMap: vi.fn(() => ({
    database: () => ({
      potion: { icon: "potion-icon" },
    }),
  })),
});

describe("BattleAi health presentation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setActionBattleSystems({});
  });

  test("reuses the standard RPGJS HP component above the entity graphic", () => {
    const event = createEvent();
    const ai = new BattleAi(event as any, {
      presentation: {
        role: "boss",
        healthBar: {
          style: { width: 120, fillColor: "#cc2244" },
        },
      },
    });

    expect(event.mergeComponents).toHaveBeenCalledWith(
      "top",
      [
        expect.objectContaining({
          id: "rpg:hpBar",
          props: expect.objectContaining({
            style: expect.objectContaining({
              width: 120,
              height: 9,
              fillColor: "#cc2244",
            }),
            text: undefined,
          }),
        }),
      ],
      expect.objectContaining({
        width: 120,
        marginBottom: 4,
      })
    );
    ai.destroy();
  });

  test("can disable the standard HP component for one AI", () => {
    const event = createEvent();
    const ai = new BattleAi(event as any, {
      presentation: { healthBar: false },
    });

    expect(event.mergeComponents).not.toHaveBeenCalled();
    ai.destroy();
  });

  test("does not duplicate an HP component already supplied by the game", () => {
    const event = createEvent();
    event.componentsTop.mockReturnValue(
      JSON.stringify({
        components: [[{ id: "rpg:hpBar", type: "hpBar" }]],
        layout: {},
      })
    );
    const ai = new BattleAi(event as any);

    expect(event.mergeComponents).not.toHaveBeenCalled();
    ai.destroy();
  });

  test("keeps the skill impact media in AI-owned hurt visuals", () => {
    const clientVisual = vi.fn();
    const event = createEvent();
    event.hp = 10;
    event.getCurrentMap.mockReturnValue({ clientVisual });
    const ai = new BattleAi(event as any);

    ai.handleDamage(createPlayer() as any, {
      damage: 3,
      defeated: false,
      skill: {
        id: "arcane",
        name: "Arcane",
        animation: "arcane-impact",
      },
    });

    expect(clientVisual).toHaveBeenCalledWith(
      ACTION_BATTLE_CLIENT_VISUAL_ID,
      expect.objectContaining({
        moment: "hurt",
        skill: expect.objectContaining({
          id: "arcane",
          animation: "arcane-impact",
        }),
      }),
    );
    ai.destroy();
  });
});

describe("BattleAi defeat flow", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    setActionBattleSystems({});
  });

  test("awards the attacker and requests a defeated remove transition", () => {
    const event = createEvent();
    const attacker = createPlayer();
    const ai = new BattleAi(event as any, {
      animations: {
        die: {
          animationName: "die",
          repeat: 1,
          delayMs: 700,
        },
      },
      rewards: {
        exp: 25,
        gold: 7,
        items: [{ itemId: "potion", amount: 2, chance: 100 }],
        showNotification: true,
      },
    });

    expect(ai.handleDamage(attacker as any, { damage: 10, defeated: true })).toBe(true);

    expect(attacker.exp).toBe(25);
    expect(attacker.gold).toBe(7);
    expect(attacker.addItem).toHaveBeenCalledWith("potion", 2);
    expect(event.setGraphicAnimation).not.toHaveBeenCalledWith("die", 1);
    expect(event.remove).toHaveBeenCalledWith({
      reason: "defeated",
      data: {
        animation: expect.objectContaining({
          animationName: "die",
          delayMs: 700,
        }),
        deathPresentation: {
          effect: "explosionSmall",
          durationMs: 450,
          scale: 1.4,
          shake: true,
        },
      },
      transition: {
        animation: "die",
        graphic: undefined,
        effect: "explosionSmall",
        duration: 700,
      },
      timeoutMs: 700,
    });
  });

  test("supports the context onDefeated callback and manual reward control", () => {
    const event = createEvent();
    const attacker = createPlayer();
    const onDefeated = vi.fn(({ reward }) => {
      expect(reward.awarded).toBe(false);
      reward.giveTo(attacker as any);
      expect(reward.awarded).toBe(true);
    });
    const ai = new BattleAi(event as any, {
      autoAwardRewards: false,
      rewards: {
        exp: 10,
      },
      onDefeated,
    });

    ai.handleDamage(attacker as any, { damage: 10, defeated: true });

    expect(onDefeated).toHaveBeenCalledWith(
      expect.objectContaining({
        event,
        attacker,
        reward: expect.any(Object),
        remove: expect.any(Function),
      })
    );
    expect(attacker.exp).toBe(10);
    expect(event.remove).toHaveBeenCalledWith({
      reason: "defeated",
      data: {
        animation: null,
        deathPresentation: {
          effect: "explosionSmall",
          durationMs: 450,
          scale: 1.4,
          shake: true,
        },
      },
      transition: {
        animation: undefined,
        graphic: undefined,
        effect: "explosionSmall",
        duration: 450,
      },
      timeoutMs: 450,
    });
  });

  test("can disable the fallback death presentation", () => {
    const event = createEvent();
    const ai = new BattleAi(event as any, {
      presentation: { death: false },
    });

    ai.handleDamage(createPlayer() as any, { damage: 10, defeated: true });

    expect(event.remove).toHaveBeenCalledWith({
      reason: "defeated",
      data: {
        animation: null,
        deathPresentation: false,
      },
      transition: undefined,
      timeoutMs: 0,
    });
  });
});

describe("BattleAi vision setup", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    setActionBattleSystems({});
  });

  test("retries vision attachment when the physics body is not ready yet", () => {
    vi.useFakeTimers();
    const event = createEvent();
    const visionShape = { id: "vision_monster-1" };
    event.attachShape.mockReturnValueOnce(undefined).mockReturnValueOnce(visionShape);

    const ai = new BattleAi(event as any);

    expect(event.attachShape).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60);

    expect(event.attachShape).toHaveBeenCalledTimes(2);
    expect(event.attachShape).toHaveBeenLastCalledWith("vision_monster-1", {
      radius: 150,
      width: 300,
      height: 300,
      angle: 360,
    });

    ai.destroy();
  });
});

describe("BattleAi behavior tree", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    setActionBattleSystems({});
  });

  test("executes simplified behavior intents", () => {
    vi.useFakeTimers();
    const event = createEvent();
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    const player = {
      ...createPlayer(),
      x: vi.fn(() => 20),
      y: vi.fn(() => 0),
    };
    const ai = new BattleAi(event as any, {
      simpleBehavior: {
        when: [ifTargetVisible(chase())],
      },
    });

    ai.onDetectInShape(player as any, {});
    vi.advanceTimersByTime(100);

    expect(event.moveTo).toHaveBeenCalledWith(player);
    ai.destroy();
  });

  test("composes named AI presets with local overrides", () => {
    vi.useFakeTimers();
    const event = createEvent();
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    setActionBattleSystems({
      ai: {
        presets: {
          slime: {
            preset: "aggressive",
            visionRange: 220,
            simpleBehavior: {
              otherwise: chase(),
            },
          },
        },
      },
    });

    const ai = new BattleAi(event as any, {
      preset: "slime",
      attackRange: 70,
    });

    expect(event.attachShape).toHaveBeenCalledWith("vision_monster-1", {
      radius: 220,
      width: 440,
      height: 440,
      angle: 360,
    });
    ai.destroy();
  });

  test("local behavior tree overrides preset simple behavior", () => {
    vi.useFakeTimers();
    const event = createEvent();
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    const player = {
      ...createPlayer(),
      hp: 10,
      x: vi.fn(() => 20),
      y: vi.fn(() => 0),
    };
    setActionBattleSystems({
      ai: {
        presets: {
          ranged: {
            simpleBehavior: {
              otherwise: chase(),
            },
          },
        },
      },
    });

    const ai = new BattleAi(event as any, {
      preset: "ranged",
      behaviorTree: () => ({ status: "success", intent: idle() }),
    });

    ai.onDetectInShape(player as any, {});
    vi.advanceTimersByTime(100);

    expect(event.moveTo).not.toHaveBeenCalled();
    expect(event.stopMoveTo).toHaveBeenCalled();
    ai.destroy();
  });

  test("does not target an already defeated player", () => {
    const event = createEvent();
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    const ai = new BattleAi(event as any);
    const player = {
      ...createPlayer(),
      hp: 0,
      x: vi.fn(() => 20),
      y: vi.fn(() => 0),
    };

    ai.onDetectInShape(player as any, {});

    expect(ai.getTarget()).toBeNull();
    ai.destroy();
  });

  test("approaches a visible target while alert but not yet in combat range", () => {
    vi.useFakeTimers();
    const event = createEvent();
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    const player = {
      ...createPlayer(),
      hp: 10,
      x: vi.fn(() => 120),
      y: vi.fn(() => 0),
    };
    const ai = new BattleAi(event as any, {
      attackRange: 50,
      visionRange: 150,
    });

    ai.onDetectInShape(player as any, {});
    vi.advanceTimersByTime(100);

    expect(event.moveTo).toHaveBeenCalledWith(player);
    ai.destroy();
  });

  test("normalizes position move targets before calling RPGJS moveTo", () => {
    vi.useFakeTimers();
    const event = createEvent();
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });

    const ai = new BattleAi(event as any, {
      patrolWaypoints: [{ x: 32, y: 48 }],
      moveToCooldown: 0,
    });

    expect(event.moveTo).toHaveBeenCalledWith({ x: 32, y: 48 });
    ai.destroy();
  });

  test("targets its attacker after taking non-lethal damage", () => {
    vi.useFakeTimers();
    const event = createEvent();
    event.hp = 9;
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    const player = {
      ...createPlayer(),
      hp: 10,
      x: vi.fn(() => 120),
      y: vi.fn(() => 0),
    };
    const ai = new BattleAi(event as any, {
      attackRange: 50,
      visionRange: 150,
    });

    ai.handleDamage(player as any, { damage: 1, defeated: false });

    expect(ai.getTarget()).toBe(player);
    ai.destroy();
  });

  test("waits for damage recovery before chasing its attacker", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const event = createEvent();
    event.hp = 9;
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    const player = {
      ...createPlayer(),
      hp: 10,
      x: vi.fn(() => 120),
      y: vi.fn(() => 0),
    };
    const ai = new BattleAi(event as any, {
      attackRange: 50,
      visionRange: 150,
      hitstunMs: 100,
      moveToCooldown: 0,
    });

    ai.handleDamage(player as any, { damage: 1, defeated: false });
    vi.advanceTimersByTime(200);
    expect(event.moveTo).not.toHaveBeenCalledWith(player);

    vi.advanceTimersByTime(100);
    expect(event.moveTo).toHaveBeenCalledWith(player);
    ai.destroy();
  });

  test("chases its attacker after hitstun ends", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const event = createEvent();
    event.hp = 9;
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    const player = {
      ...createPlayer(),
      hp: 10,
      x: vi.fn(() => 120),
      y: vi.fn(() => 0),
    };
    const ai = new BattleAi(event as any, {
      attackRange: 50,
      visionRange: 150,
      hitstunMs: 100,
      moveToCooldown: 0,
    });

    ai.handleDamage(player as any, { damage: 1, defeated: false });
    vi.advanceTimersByTime(300);

    expect(event.moveTo).toHaveBeenCalledWith(player);
    ai.destroy();
  });

  test("behavior tree idle fallback does not block target acquisition", () => {
    vi.useFakeTimers();
    const event = createEvent();
    const player = {
      ...createPlayer(),
      hp: 10,
      x: vi.fn(() => 30),
      y: vi.fn(() => 0),
    };
    const map = {
      getPlayers: vi.fn(() => [player]),
      getEvents: vi.fn(() => [event]),
    };
    event.getCurrentMap.mockReturnValue(map);
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });

    const ai = new BattleAi(event as any, {
      simpleBehavior: {
        otherwise: idle(),
      },
    });

    vi.advanceTimersByTime(100);

    expect(ai.getTarget()).toBe(player);
    ai.destroy();
  });

  test("clears its target when the player is defeated", () => {
    vi.useFakeTimers();
    const event = createEvent();
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    const player = {
      ...createPlayer(),
      hp: 10,
      x: vi.fn(() => 20),
      y: vi.fn(() => 0),
    };
    const ai = new BattleAi(event as any);

    ai.onDetectInShape(player as any, {});
    expect(ai.getTarget()).toBe(player);

    player.hp = 0;
    vi.advanceTimersByTime(100);

    expect(ai.getTarget()).toBeNull();
    expect(event.stopMoveTo).toHaveBeenCalled();
    ai.destroy();
  });

  test("can target hostile BattleAi events by faction", () => {
    vi.useFakeTimers();
    const event = createEvent();
    const hostile = {
      ...createEvent(),
      id: "bandit-1",
      hp: 10,
      x: vi.fn(() => 30),
      y: vi.fn(() => 0),
      battleAi: {
        getFaction: () => "bandits",
        getTargets: () => "players",
      },
    };
    const map = {
      getPlayers: vi.fn(() => []),
      getEvents: vi.fn(() => [event, hostile]),
    };
    event.getCurrentMap.mockReturnValue(map);
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });

    const ai = new BattleAi(event as any, {
      faction: "guards",
      targets: ["bandits"],
    });

    vi.advanceTimersByTime(100);

    expect(ai.getTarget()).toBe(hostile);
    ai.destroy();
  });

  test("dash attacks emit an attack visual before the dash hit", () => {
    vi.useFakeTimers();
    const clientVisual = vi.fn();
    const event = createEvent();
    event.getCurrentMap.mockReturnValue({ clientVisual });
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    const player = {
      ...createPlayer(),
      hp: 10,
      x: vi.fn(() => 20),
      y: vi.fn(() => 0),
    };
    const ai = new BattleAi(event as any, {
      attackPatterns: [AttackPattern.DashAttack],
      attackRange: 50,
      moveToCooldown: 0,
    });

    ai.onDetectInShape(player as any, {});
    (ai as any).performDashAttack();

    expect(clientVisual).toHaveBeenCalledWith(
      ACTION_BATTLE_CLIENT_VISUAL_ID,
      expect.objectContaining({
        moment: "attack",
        objectId: "monster-1",
        targetId: "player-1",
        pattern: AttackPattern.DashAttack,
      })
    );
    ai.destroy();
  });

  test("selects distance-appropriate special attacks without repetition", () => {
    const event = createEvent();
    const player = {
      ...createPlayer(),
      hp: 10,
      x: vi.fn(() => 20),
      y: vi.fn(() => 0),
    };
    const ai = new BattleAi(event as any, {
      attackRange: 100,
      attackPatterns: [
        AttackPattern.Zone,
        AttackPattern.DashAttack,
        AttackPattern.Melee,
      ],
    });
    ai.onDetectInShape(player as any, {});

    expect((ai as any).selectAttackCandidates(20)).toEqual([
      AttackPattern.Zone,
      AttackPattern.Melee,
    ]);
    (ai as any).lastAttackPattern = AttackPattern.Zone;
    expect((ai as any).selectAttackCandidates(20)).toEqual([
      AttackPattern.Melee,
    ]);
    expect((ai as any).selectAttackCandidates(90)).toEqual([
      AttackPattern.DashAttack,
      AttackPattern.Melee,
    ]);
    ai.destroy();
  });

  test("respects a skill cooldown inside enemy combos", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const event = createEvent();
    const onUse = vi.fn();
    const skill = {
      id: "fire",
      spCost: 0,
      action: { cooldownMs: 800 },
      onUse,
    };
    const player = {
      ...createPlayer(),
      hp: 10,
      x: vi.fn(() => 20),
      y: vi.fn(() => 0),
    };
    const ai = new BattleAi(event as any, {
      attackSkill: skill,
    });
    ai.onDetectInShape(player as any, {});
    const profile = (ai as any).getAttackProfile(AttackPattern.Combo);

    (ai as any).executeMeleeAttack(profile, AttackPattern.Combo);
    vi.setSystemTime(1300);
    (ai as any).executeMeleeAttack(profile, AttackPattern.Combo);
    vi.setSystemTime(1800);
    (ai as any).executeMeleeAttack(profile, AttackPattern.Combo);

    expect(onUse).toHaveBeenCalledTimes(2);
    ai.destroy();
  });

  test("executes advanced server intents and emits a generic visual cue", () => {
    vi.useFakeTimers();
    const clientVisual = vi.fn();
    const event = createEvent();
    event.getCurrentMap.mockReturnValue({ clientVisual });
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    const customRun = vi.fn();
    const customAction = vi.fn();
    setActionBattleSystems({
      ai: {
        actions: {
          enrage: customAction,
        },
      },
    });
    const ai = new BattleAi(event as any, {
      moveToCooldown: 0,
      behaviorTree: () => ({
        status: "success",
        intent: [
          run(customRun),
          setSpeed(7),
          moveToPoint({ x: 40, y: 60 }),
          holdPosition(),
          teleportTo({ x: 80, y: 90 }),
          visual({ kind: "rage", durationMs: 500 }),
          callAction("enrage", { multiplier: 2 }),
        ],
      }),
    });

    vi.advanceTimersByTime(100);

    expect(customRun).toHaveBeenCalledWith(
      expect.objectContaining({ event, memory: expect.any(Object) })
    );
    expect(event.speed).toBe(7);
    expect(event.moveTo).toHaveBeenCalledWith({ x: 40, y: 60 });
    expect(event.teleport).toHaveBeenCalledWith({ x: 80, y: 90 });
    expect(customAction).toHaveBeenCalledWith(
      expect.objectContaining({ event }),
      { multiplier: 2 }
    );
    expect(clientVisual).toHaveBeenCalledWith(
      ACTION_BATTLE_CLIENT_VISUAL_ID,
      expect.objectContaining({
        moment: "ai",
        objectId: "monster-1",
        visual: {
          kind: "rage",
          durationMs: 500,
        },
      })
    );
    ai.destroy();
  });

  test("continues with default AI when a registered action is unknown", () => {
    vi.useFakeTimers();
    const event = createEvent();
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    const player = {
      ...createPlayer(),
      hp: 10,
      x: vi.fn(() => 120),
      y: vi.fn(() => 0),
    };
    const ai = new BattleAi(event as any, {
      attackRange: 50,
      visionRange: 150,
      moveToCooldown: 0,
      behaviorTree: () => ({
        status: "success",
        intent: callAction("not-registered"),
      }),
    });

    ai.onDetectInShape(player as any, {});
    vi.advanceTimersByTime(100);

    expect(event.moveTo).toHaveBeenCalledWith(player);
    ai.destroy();
  });

  test("teleports near the current target using a server-selected position", () => {
    vi.useFakeTimers();
    const event = createEvent();
    event.attachShape.mockReturnValue({ id: "vision_monster-1" });
    const player = {
      ...createPlayer(),
      hp: 10,
      x: vi.fn(() => 100),
      y: vi.fn(() => 50),
    };
    const ai = new BattleAi(event as any, {
      behaviorTree: () => ({
        status: "success",
        intent: teleportNearTarget({
          distance: 30,
          angleDegrees: 0,
        }),
      }),
    });

    ai.onDetectInShape(player as any, {});
    vi.advanceTimersByTime(100);

    expect(event.teleport).toHaveBeenCalledWith({ x: 130, y: 50 });
    ai.destroy();
  });
});
