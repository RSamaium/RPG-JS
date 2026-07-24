import {
  ATK,
  Components,
  MAXHP,
  MAXSP,
  PDEF,
  RpgEvent,
  RpgPlayer,
  createServer,
  provideServerModules,
  type EventDefinition,
} from "@rpgjs/server";
import {
  AttackPattern,
  BattleAi,
  EnemyType,
  action,
  chase,
  condition,
  createActionBattleVisual,
  distanceLessThan,
  flee,
  hpBelow,
  ifDistanceLessThan,
  ifHpBelow,
  ifTargetInRange,
  keepDistance,
  provideActionBattle,
  selector,
  sequence,
  targetInRange,
  useAttack,
  useSkill,
} from "@rpgjs/action-battle/server";
import { provideMain } from "./modules/main";

const STAGE_WIDTH = 2048;
const STAGE_HEIGHT = 1536;

const EnemyClaw = {
  id: "enemy-claw",
  name: "Enemy Claw",
  atk: 10,
  knockbackForce: 24,
  _type: "weapon" as const,
};

const WoodThrowSkill = {
  id: "wood-throw",
  name: "Lancer bois",
  description: "Throws a wood projectile.",
  spCost: 0,
  hitRate: 1,
  power: 16,
  coefficient: { [ATK]: 0.8, [PDEF]: 0.25 },
  _type: "skill" as const,
  action: {
    target: "enemy" as const,
    range: 260,
    mode: "projectile" as const,
    visual: {
      fx: "impactBurst",
      color: "#f7d794",
      accentColor: "#7a4b16",
      scale: 0.92,
    },
    projectile: {
      type: "wood",
      speed: 230,
      range: 260,
      collision: {
        ignoreOwner: true,
        predictImpact: false,
      },
    },
  },
};

const FireSkill = {
  id: "fire",
  name: "Fire",
  description: "A ranged skill that plays the exp.png animation.",
  spCost: 0,
  hitRate: 1,
  power: 24,
  coefficient: { [ATK]: 1, [PDEF]: 0.35 },
  _type: "skill" as const,
  action: {
    target: "enemy" as const,
    range: 240,
    mode: "instant" as const,
    visual: {
      fx: "magicBurst",
      color: "#ffd166",
      accentColor: "#a62c21",
      scale: 1.2,
    },
  },
  onUse(user: RpgEvent | RpgPlayer, target: RpgEvent | RpgPlayer | undefined, ctx: any) {
    ctx.defaultEffect(target);
    if (!target) return;
    user.getCurrentMap()?.showAnimation(
      { x: target.x(), y: target.y() },
      "fire-impact",
    );
  },
};

type SpawnBehavior = "aggressive" | "ranged" | "defensive" | "passive";
type SpawnEnemyType = "brute" | "wood-thrower" | "fire-caster" | "guardian";
type SpawnTarget = "players" | "events" | "all" | "hostile";

const SKILL_ATTACK_COOLDOWN: Record<Extract<SpawnEnemyType, "wood-thrower" | "fire-caster">, number> = {
  "wood-thrower": 2800,
  "fire-caster": 3600,
};

interface SpawnEnemyPayload {
  enemyType?: SpawnEnemyType;
  behavior?: SpawnBehavior;
  faction?: string;
  targets?: SpawnTarget;
  x?: number;
  y?: number;
}

interface MoveEnemyPayload {
  eventId?: string;
  x?: number;
  y?: number;
}

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(min, Math.min(max, numberValue));
};

const validTargets = new Set(["players", "events", "all", "hostile"]);

const buildBehaviorTree = (behavior: SpawnBehavior, skill?: any) => {
  if (behavior === "passive") {
    return action(() => ({ type: "idle" }));
  }

  if (behavior === "defensive") {
    return selector([
      sequence([condition(hpBelow(0.3)), action(flee())]),
      sequence([condition(distanceLessThan(80)), action(useAttack(AttackPattern.Combo))]),
      action(keepDistance(120)),
    ]);
  }

  if (behavior === "ranged" && skill) {
    return selector([
      sequence([condition(hpBelow(0.25)), action(flee())]),
      sequence([condition(targetInRange(skill.action.range)), action(useSkill(skill))]),
      sequence([condition(targetInRange(320)), action(keepDistance(145))]),
      action(() => ({ type: "idle" })),
    ]);
  }

  return selector([
    sequence([condition(hpBelow(0.15)), action(useAttack(AttackPattern.Charged))]),
    sequence([condition(targetInRange(64)), action(useAttack(AttackPattern.Combo))]),
    action(chase()),
  ]);
};

function createSpawnedEnemy(payload: Required<SpawnEnemyPayload>): EventDefinition {
  const skill =
    payload.enemyType === "wood-thrower"
      ? WoodThrowSkill
      : payload.enemyType === "fire-caster"
        ? FireSkill
        : undefined;
  const aiBehavior = skill && payload.behavior !== "passive" ? "ranged" : payload.behavior;

  return {
    name: `Spawned ${payload.enemyType}`,
    onInit() {
      this.setGraphic("monster");
      this.name =
        payload.enemyType === "guardian"
          ? "Guardian"
          : payload.enemyType === "wood-thrower"
          ? "Wood Thrower"
          : payload.enemyType === "fire-caster"
            ? "Fire Caster"
            : "Brute";
      this.speed = aiBehavior === "aggressive" ? 3 : 2.2;
      this.through = false;
      const maxHp =
        payload.enemyType === "guardian"
          ? 900
          : payload.enemyType === "brute"
            ? 260
            : 190;
      const maxSp = 100;
      this.param[MAXHP] = maxHp;
      this.param[MAXSP] = maxSp;
      this.hp = maxHp;
      this.sp = maxSp;
      this.param[ATK] =
        payload.enemyType === "guardian" ? 24 : payload.enemyType === "brute" ? 17 : 12;
      this.param[PDEF] =
        payload.enemyType === "guardian" ? 12 : payload.enemyType === "brute" ? 8 : 4;
      this.addItem(EnemyClaw);
      this.equip(EnemyClaw.id);
      this.setComponentsTop(
        [
          Components.text("{name}", {
            fill: "#ffffff",
            fontSize: 12,
            fontWeight: "700",
            stroke: "#111827",
          }),
          Components.spBar(
            {
              width: 72,
              height: 5,
              bgColor: "#172033",
              fillColor: "#38bdf8",
              borderColor: "#111827",
              borderWidth: 1,
            },
            null,
          ),
        ],
        {
          width: 84,
          height: 34,
          marginBottom: 6,
        },
      );
      (this as any).battleAi = new BattleAi(this, {
        preset: aiBehavior === "ranged" ? "ranged" : "aggressive",
        enemyType:
          aiBehavior === "defensive"
            ? EnemyType.Defensive
            : aiBehavior === "ranged"
              ? EnemyType.Ranged
              : EnemyType.Aggressive,
        faction: payload.faction,
        targets: payload.targets,
        attackSkill: skill,
        attackRange: skill?.action?.range ?? 62,
        attackCooldown: skill
          ? SKILL_ATTACK_COOLDOWN[payload.enemyType as keyof typeof SKILL_ATTACK_COOLDOWN]
          : 700,
        visionRange: 320,
        dodgeChance: aiBehavior === "defensive" ? 0.28 : 0.14,
        attackPatterns: skill
          ? [AttackPattern.Melee, AttackPattern.Zone]
          : [AttackPattern.Melee, AttackPattern.Combo, AttackPattern.Charged],
        behaviorTree: buildBehaviorTree(aiBehavior, skill),
        rewards: { exp: 10, gold: 3 },
        presentation:
          payload.enemyType === "guardian"
            ? { role: "boss", name: "Guardian of the Lab" }
            : { role: "enemy" },
      });
    },
  };
}

const player = {
  onConnected(player: RpgPlayer) {
    player.name = "Target Hero";
    player.setGraphic("hero");
    player.initializeDefaultStats();
    player.hp = 240;
    player.sp = 100;
    player.param[MAXHP] = 240;
    player.param[MAXSP] = 100;
    player.param[ATK] = 14;
    player.changeMap("action-battle-lab", { x: 260, y: 360 });
  },

  async onInput(player: RpgPlayer, input: any) {
    const data = input.data ?? {};

    if (input?.action === "playground-action-battle:move-enemy") {
      const map = player.getCurrentMap();
      const payload: Required<MoveEnemyPayload> = {
        eventId: typeof data.eventId === "string" ? data.eventId : "",
        x: clamp(data.x, 32, STAGE_WIDTH - 48, STAGE_WIDTH / 2),
        y: clamp(data.y, 48, STAGE_HEIGHT - 48, STAGE_HEIGHT / 2),
      };
      const event = payload.eventId.startsWith("spawned-")
        ? map?.getEvent<RpgEvent>(payload.eventId)
        : undefined;

      if (!event) return;

      event.stopMoveTo();
      await event.teleport({ x: payload.x, y: payload.y });
      return;
    }

    if (input?.action !== "playground-action-battle:spawn-enemy") return;

    const payload: Required<SpawnEnemyPayload> = {
      enemyType: ["brute", "wood-thrower", "fire-caster", "guardian"].includes(data.enemyType)
        ? data.enemyType
        : "brute",
      behavior: ["aggressive", "ranged", "defensive", "passive"].includes(data.behavior)
        ? data.behavior
        : "aggressive",
      faction: typeof data.faction === "string" && data.faction ? data.faction : "monsters",
      targets: validTargets.has(data.targets) ? data.targets : "players",
      x: clamp(data.x, 32, STAGE_WIDTH - 48, STAGE_WIDTH / 2),
      y: clamp(data.y, 48, STAGE_HEIGHT - 48, STAGE_HEIGHT / 2),
    };

    await player.getCurrentMap()?.createDynamicEvent({
      id: `spawned-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      x: payload.x,
      y: payload.y,
      event: createSpawnedEnemy(payload),
    });
  },
};

export default createServer({
  providers: [
    provideMain(),
    provideActionBattle({
      visual: createActionBattleVisual("impact"),
      combat: {
        pvp: true,
      },
      ai: {
        presets: {
          aggressive: {
            attackRange: 62,
            visionRange: 300,
            attackCooldown: 700,
            simpleBehavior: {
              when: [
                ifHpBelow(0.12, useAttack(AttackPattern.Charged)),
                ifTargetInRange(useAttack(AttackPattern.Combo), 66),
              ],
              otherwise: chase(),
            },
          },
          ranged: {
            attackRange: 240,
            visionRange: 320,
            attackCooldown: 1200,
            simpleBehavior: {
              when: [
                ifHpBelow(0.25, flee()),
                ifDistanceLessThan(95, keepDistance(145)),
              ],
              otherwise: chase(),
            },
          },
        },
      },
    }),
    provideServerModules([
      {
        database: async () => ({
          "enemy-claw": EnemyClaw,
          "wood-throw": WoodThrowSkill,
          fire: FireSkill,
        }),
        player,
        maps: [
          {
            id: "action-battle-lab",
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            hitboxes: [
              { id: "top-wall", x: 0, y: 0, width: STAGE_WIDTH, height: 4 },
              { id: "bottom-wall", x: 0, y: STAGE_HEIGHT - 4, width: STAGE_WIDTH, height: 4 },
              { id: "left-wall", x: 0, y: 0, width: 4, height: STAGE_HEIGHT },
              { id: "right-wall", x: STAGE_WIDTH - 4, y: 0, width: 4, height: STAGE_HEIGHT },
            ],
            events: [],
          } as any,
        ],
      },
    ]),
  ],
});
