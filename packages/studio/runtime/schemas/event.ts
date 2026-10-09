import { FromSchema } from "json-schema-to-ts";
import { MAP_EDITOR_CONSTANTS } from "../constants";

export const characterSchema = {
  graphic: {
    type: "string",
    title: "Graphic",
    format: {
      name: "media",
      type: "spritesheet",
      buttonLabel: "Select Character",
      useUpload: {
        accept: "image/*",
      },
      // useAiGenerate: {
      //   onGenerate(prompt: string) {
      //     console.log(prompt);
      //   },
      //   creditCost: creditCost.spritesheet.creditCost,
      // },
    } as any,
  },
  faceset: {
    type: "string",
    title: "Faceset",
    format: {
      name: "media",
      type: "faceset",
      buttonLabel: "Select Faceset",
      useUpload: {
        accept: "image/*",
      },
      // useAiGenerate: {
      //   onGenerate(prompt: string) {
      //     console.log(prompt);
      //   },
      //   creditCost: creditCost.faceset.creditCost,
      // },
    } as any,
  },
} as const;

export const eventHitboxSchema = {
  type: "object",
  title: "Hitbox",
  description: "Custom collision hitbox size for this event page",
  properties: {
    width: {
      type: "number",
      title: "Width",
      minimum: 1,
      default: 32
    },
    height: {
      type: "number",
      title: "Height",
      minimum: 1,
      default: 32
    }
  },
  required: ["width", "height"]
} as const;

export const triggerSchema = {
  type: "object",
  properties: {
    type: {
      type: "string",
      title: "Trigger Type",
      description: "Type of trigger (onInit, onAction, onChange, onTouch)",
      enum: ["onInit", "onAction", "onChange", "onTouch"]
    },
    blockCollectionId: {
      type: "string",
      title: "Block Collection ID",
      description: "ID of the block collection for this trigger"
    },
    enabled: {
      type: "boolean",
      title: "Enabled",
      description: "Whether this trigger is enabled",
      default: true
    },
    hitbox: eventHitboxSchema,
    typeData: {
      type: "object",
      title: "Type Data",
      description: "Trigger-specific data",
      properties: {
        touchTarget: {
          type: "string",
          title: "Touch Target",
          description: "For onTouch triggers, selects whether the workflow runs on player touch or event touch",
          enum: ["player", "event"]
        }
      },
      additionalProperties: true
    }
  },
  required: ["type"]
} as const;

export const pageSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      title: "Page ID",
      description: "Unique identifier for the page"
    },
    conditions: {
      type: "object",
      title: "Conditions",
      properties: {
        switch1: { type: "string", title: "Switch 1" },
        switch2: { type: "string", title: "Switch 2" },
        variable: { type: "string", title: "Variable" },
        variableValue: { type: "number", title: "Variable Value" },
        selfSwitch: { type: "string", title: "Self Switch" },
        item: { type: "string", title: "Item" },
        goldComparison: { type: "string", title: "Gold Comparison" },
        goldValueType: { type: "string", title: "Gold Value Type" },
        goldAmount: { type: "number", title: "Gold Amount" },
        goldVariableId: { type: "string", title: "Gold Variable" },
        equippedItem: { type: "string", title: "Equipped Item" },
        equipped: { type: "boolean", title: "Is Equipped" },
        level: { type: "number", title: "Level" },
        actor: { type: "string", title: "Actor" }
      }
    },
    typeData: {
      type: "object",
      title: "Type Data",
      description: "Event-type-specific data for this page",
      properties: {
        touchTarget: {
          type: "string",
          title: "Touch Target",
          description: "For onTouch triggers, selects whether the workflow runs on player touch or event touch",
          enum: ["player", "event"]
        }
      },
      additionalProperties: true
    },
    graphic: {
      type: "string",
      title: "Graphic",
      format: {
        name: "media",
        type: "spritesheet",
        buttonLabel: "Select Character",
        useUpload: {
          accept: "image/*",
        }
      } as any
    },
    direction: {
      type: "string",
      title: "Direction",
      enum: ["down", "left", "right", "up"],
      default: "down"
    },
    pattern: {
      type: "string",
      title: "Pattern",
      enum: ["initial", "loop", "stop"],
      default: "initial"
    },
    hitbox: eventHitboxSchema,
    movement: {
      type: "object",
      title: "Movement",
      properties: {
        type: {
          type: "string",
          enum: ["fixed", "random", "approach", "custom"],
          default: "fixed"
        },
        speed: {
          type: "string",
          enum: ["slowest", "slower", "slow", "normal", "fast", "faster", "fastest"],
          default: "normal"
        },
        frequency: {
          type: "string",
          enum: ["lowest", "lower", "low", "normal", "high", "higher", "highest"],
          default: "normal"
        },
        route: {
          type: "array",
          items: { type: "object" } // Placeholder for move route commands
        }
      }
    },
    trigger: {
      type: "string",
      title: "Trigger",
      enum: ["action_button", "player_touch", "event_touch", "autorun", "parallel"],
      default: "action_button"
    },
    options: {
      type: "object",
      title: "Options",
      properties: {
        directionFix: { type: "boolean", title: "Direction Fix" },
        through: { type: "boolean", title: "Through" },
        alwaysOnTop: { type: "boolean", title: "Always on Top" },
        alwaysOnBottom: { type: "boolean", title: "Always on Bottom" }
      }
    },
    blockCollectionId: {
      type: "string",
      title: "Block Collection ID",
      description: "ID of the block collection for this page"
    }
  },
  required: ["id"]
} as const;

export const eventSchema = {
  type: "object",
  properties: {
    eventType: {
      type: "string",
      title: "Event Type",
      description: "The type of event to create",
      enum: ["character", "enemy", "free", "chest"],
      enumNames: ["Character", "Enemy", "Free (From Scratch)", "Chest"],
      default: "character"
    },
    name: {
      type: "string",
      title: "Name",
      description: "The name of the event",
    },
    description: {
      type: "string",
      title: "Description",
      description: "The description of the event",
      format: "textarea",
    },
    pages: {
      type: "array",
      title: "Pages",
      description: "Event pages with their configuration and commands",
      items: pageSchema,
      maxItems: MAP_EDITOR_CONSTANTS.MAX_EVENT_PAGES
    },
    "@mapIds": {
      type: "array",
      title: "Map IDs",
      description: "Computed list of maps that place this event",
      items: { type: "string" }
    }
  },
} as const;

export type Trigger = FromSchema<typeof triggerSchema>;
export type Event = FromSchema<typeof eventSchema>;
export type EventData = Event & { _id: string };
