import { FromSchema } from "json-schema-to-ts";
import { createAppearanceSchema, inventorySchemas, parameterSchemas } from "./character-config";
import { itemSchema, skillSchema } from "./database";
import { characterSchema } from "./event";

export const enemyRewardSchema = {
  type: "object",
  title: "Reward",
  format: {
    layout: "reward",
  } as any,
  properties: {
    exp: {
      type: "number",
      title: "Experience",
      minimum: 0,
      default: 0,
    },
    gold: {
      type: "number",
      title: "Gold",
      minimum: 0,
      default: 0,
    },
    items: {
      type: "array",
      title: "Items",
      items: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            title: "Item",
            $ref: "#/functions/item",
            format: {
              add: {
                schema: itemSchema,
              },
            } as any,
          },
          amount: {
            type: "number",
            title: "Amount",
            minimum: 1,
            default: 1,
          },
          chance: {
            type: "number",
            title: "Chance",
            minimum: 0,
            maximum: 100,
            default: 100,
          },
        },
        required: ["itemId", "amount", "chance"],
      },
    },
  },
} as const;

const enemyAttackTimingSchema = {
  type: "object",
  properties: {
    startupMs: { type: "number", title: "enemy combat.startup", minimum: 0 },
    activeMs: { type: "number", title: "enemy combat.active", minimum: 1 },
    recoveryMs: { type: "number", title: "enemy combat.recovery", minimum: 0 },
    cooldownMs: { type: "number", title: "enemy combat.cooldown", minimum: 0 },
  },
} as const;

export const enemyAiBehaviorSchema = {
  type: "object",
  title: "AI Behavior",
  format: {
    layout: "ai",
  } as any,
  properties: {
    enemyType: {
      type: "string",
      title: "Enemy Type",
      enum: ["aggressive", "defensive", "ranged", "tank", "berserker"],
      default: "aggressive",
    },
    behaviorKey: {
      type: "string",
      title: "Behavior Key",
      description: "Optional key resolved by the action-battle AI behavior registry.",
    },
    visionRange: {
      type: "number",
      title: "Vision Range",
      minimum: 0,
      default: 150,
    },
    attackRange: {
      type: "number",
      title: "Attack Range",
      minimum: 0,
      default: 50,
    },
    attackCooldown: {
      type: "number",
      title: "Attack Cooldown",
      minimum: 0,
    },
    attackProfiles: {
      type: "object",
      title: "enemy combat.profiles",
      description: "enemy combat.profiles help",
      properties: {
        melee: { ...enemyAttackTimingSchema, title: "enemy combat.melee" },
        combo: { ...enemyAttackTimingSchema, title: "enemy combat.combo" },
        charged: { ...enemyAttackTimingSchema, title: "enemy combat.charged" },
        zone: { ...enemyAttackTimingSchema, title: "enemy combat.zone" },
        dashAttack: { ...enemyAttackTimingSchema, title: "enemy combat.dash" },
      },
    },
    attackPatterns: {
      type: "array",
      title: "Attack Patterns",
      items: {
        type: "string",
        enum: ["melee", "combo", "charged", "zone", "dashAttack"],
      },
    },
    groupBehavior: {
      type: "boolean",
      title: "Group Behavior",
      default: false,
    },
    behavior: {
      type: "object",
      title: "Behavior Gauge",
      properties: {
        baseScore: { type: "number", title: "Base Score" },
        updateInterval: { type: "number", title: "Update Interval" },
        minStateDuration: { type: "number", title: "Min State Duration" },
        assaultThreshold: { type: "number", title: "Assault Threshold" },
        retreatThreshold: { type: "number", title: "Retreat Threshold" },
      },
    },
  },
} as const;

export const enemySchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      title: "Name",
      format: { layout: "basic" },
    },
    ...characterSchema,
    ...parameterSchemas,
    ...inventorySchemas,
    skills: {
      type: "array",
      title: "Skills",
      items: {
        type: "object",
        properties: {
          skillId: {
            type: "string",
            title: "Skill",
            $ref: "#/functions/skill",
            format: {
              add: {
                schema: skillSchema,
              },
            } as any,
          },
        },
        required: ["skillId"],
      },
    },
    attackSkillId: {
      type: "string",
      title: "Attack Skill",
      $ref: "#/functions/skill",
      format: {
        add: {
          schema: skillSchema,
        },
      } as any,
    },
    behavior: enemyAiBehaviorSchema,
    aiBehavior: {
      ...enemyAiBehaviorSchema,
      description: "Deprecated alias for behavior.",
    },
    reward: enemyRewardSchema,
  },
  required: ["name"],
} as any;

export type Enemy = FromSchema<typeof enemySchema>;
export type EnemyData = Enemy & { _id: string };
