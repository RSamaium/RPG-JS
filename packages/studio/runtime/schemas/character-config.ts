import { characterSchema, eventHitboxSchema } from "./event";
import { itemSchema } from "./database";

export const characterHitboxSchema = {
  ...eventHitboxSchema,
  title: "Hero Hitbox",
  description: "Custom collision hitbox size for the hero",
  properties: {
    width: {
      type: "number",
      title: "Width",
      minimum: 1
    },
    height: {
      type: "number",
      title: "Height",
      minimum: 1
    }
  },
  format: {
    hidden: true,
    layout: "appearance",
  } as any,
} as const;

export const characterGraphicSchema = {
  ...characterSchema.graphic,
  title: "hero appearance.title",
  description: "hero appearance.description",
  format: {
    ...characterSchema.graphic.format,
    name: "character-graphic-hitbox",
    layout: "appearance",
    hitboxControlName: "hitbox",
    direction: "down",
    pattern: "loop",
    titleKey: "hero hitbox.title",
    descriptionKey: "hero hitbox.description",
    defaultHintKey: "hero hitbox.default hint",
  } as any,
} as const;

const appearanceProperties = {
  //name: { type: "string", title: "Name" },
  ...characterSchema,
  graphic: characterGraphicSchema,
  hitbox: characterHitboxSchema,
} as const;

export const createAppearanceSchema = (title: string) => ({
  type: "object",
  title,
  format: {
    layout: "appearance",
  } as any,
  properties: appearanceProperties,
} as const);

export const startingEquipmentSchema = {
  type: "object",
  title: "Starting Equipment",
  description: "Base equipment for the main character.",
  properties: {
    weaponId: {
      type: "string",
      title: "Weapon",
      $ref: "#/functions/weapon",
      format: {
        add: {
          schema: itemSchema,
        },
      } as any,
    },
    armorId: {
      type: "string",
      title: "Armor",
      $ref: "#/functions/armor",
      format: {
        add: {
          schema: itemSchema,
        },
      } as any,
    }
  },
  format: {
    layout: "inventory",
  } as any,
} as const;

export const startingInventorySchema = {
  type: "array",
  title: "Starting Inventory",
  description: "Items the player starts with.",
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
    },
    required: ["itemId", "amount"],
  },
  format: {
    layout: "inventory",
  } as any,
} as const;

export const parameterSchemas = {
  initialLevel: {
    type: "number",
    title: "Initial Level",
    description: "Starting level for the main character.",
    minimum: 1,
    default: 1,
    format: {
      layout: "parameters",
    } as any,
  },
  finalLevel: {
    type: "number",
    title: "Final Level",
    description: "Maximum level the character can reach.",
    minimum: 1,
    default: 99,
    format: {
      layout: "parameters",
    } as any,
  },
  expCurve: {
    type: "object",
    title: "Experience Curve",
    description: "Experience growth parameters per level.",
    format: {
      name: "exp-curve",
      layout: "parameters",
    } as any,
    properties: {
      basis: {
        type: "number",
        title: "Basis",
        minimum: 0,
        default: 30,
      },
      extra: {
        type: "number",
        title: "Extra",
        minimum: 0,
        default: 20,
      },
      accelerationA: {
        type: "number",
        title: "Acceleration A",
        minimum: 0,
        default: 30,
      },
      accelerationB: {
        type: "number",
        title: "Acceleration B",
        minimum: 1,
        default: 30,
      },
    },
    required: ["basis", "extra", "accelerationA", "accelerationB"],
    default: {
      basis: 30,
      extra: 20,
      accelerationA: 30,
      accelerationB: 30,
    },
  },
  parameters: {
    type: "object",
    title: "Parameters",
    description: "Level-based parameter curves for the player.",
    format: {
      name: "parameter-curves",
      layout: "parameters",
    } as any,
    properties: {
      maxHp: {
        type: "object",
        title: "Max HP",
        properties: {
          start: { type: "number", minimum: 0, default: 741 },
          end: { type: "number", minimum: 0, default: 7467 },
        },
        required: ["start", "end"],
      },
      maxSp: {
        type: "object",
        title: "Max SP",
        properties: {
          start: { type: "number", minimum: 0, default: 534 },
          end: { type: "number", minimum: 0, default: 5500 },
        },
        required: ["start", "end"],
      },
      str: {
        type: "object",
        title: "STR",
        properties: {
          start: { type: "number", minimum: 0, default: 67 },
          end: { type: "number", minimum: 0, default: 635 },
        },
        required: ["start", "end"],
      },
      agi: {
        type: "object",
        title: "AGI",
        properties: {
          start: { type: "number", minimum: 0, default: 58 },
          end: { type: "number", minimum: 0, default: 582 },
        },
        required: ["start", "end"],
      },
      int: {
        type: "object",
        title: "INT",
        properties: {
          start: { type: "number", minimum: 0, default: 36 },
          end: { type: "number", minimum: 0, default: 7318 },
        },
        required: ["start", "end"],
      },
      dex: {
        type: "object",
        title: "DEX",
        properties: {
          start: { type: "number", minimum: 0, default: 54 },
          end: { type: "number", minimum: 0, default: 564 },
        },
        required: ["start", "end"],
      },
    },
    required: ["maxHp", "maxSp", "str", "agi", "int", "dex"],
    default: {
      maxHp: { start: 741, end: 7467 },
      maxSp: { start: 534, end: 5500 },
      str: { start: 67, end: 635 },
      agi: { start: 58, end: 582 },
      int: { start: 36, end: 7318 },
      dex: { start: 54, end: 564 },
    },
  },
} as const;

export const inventorySchemas = {
  startingEquipment: startingEquipmentSchema,
  startingInventory: startingInventorySchema,
} as const;
