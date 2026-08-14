import { FromSchema } from "json-schema-to-ts";
import { createAppearanceSchema, parameterSchemas, inventorySchemas } from "./character-config";
import { skillSchema } from "./database";
import { inputKeyEnum } from "./input-controls";

export const projectSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      title: "Name",
      description: "Name of the project",
    },
    subtitle: {
      type: "string",
      title: "Subtitle",
      description: "Subtitle of the project",
    },
    keyboardControls: {
      type: "object",
      title: "Keyboard Controls",
      properties: {
        down: {
          type: "string",
          title: "Down",
          enum: inputKeyEnum,
          default: "down",
        },
        up: {
          type: "string",
          title: "Up",
          enum: inputKeyEnum,
          default: "up",
        },
        left: {
          type: "string",
          title: "Left",
          enum: inputKeyEnum,
          default: "left",
        },
        right: {
          type: "string",
          title: "Right",
          enum: inputKeyEnum,
          default: "right",
        },
        action: {
          type: "string",
          title: "Action",
          enum: inputKeyEnum,
          default: "space",
        },
        back: {
          type: "string",
          title: "Back",
          enum: inputKeyEnum,
          default: "escape",
        },
      },
    },
    hero: createAppearanceSchema("Hero"),
    combatAudio: {
      type: "object",
      title: "Combat Audio",
      properties: {
        battleMusic: {
          type: "string",
          title: "Default Battle Music",
          format: {
            name: "media",
            type: "bgm",
            buttonLabel: "Select Battle Music",
            useUpload: { accept: "audio/*" },
          } as any,
        },
        attack: { type: "string", title: "Attack Sound", format: { name: "media", type: "sound" } as any },
        skill: { type: "string", title: "Cast Sound", format: { name: "media", type: "sound" } as any },
        hit: { type: "string", title: "Impact Sound", format: { name: "media", type: "sound" } as any },
        hurt: { type: "string", title: "Hurt Sound", format: { name: "media", type: "sound" } as any },
        die: { type: "string", title: "Defeat Sound", format: { name: "media", type: "sound" } as any },
      },
    },
    audio: {
      type: "object",
      title: "Audio",
      properties: {
        ui: {
          type: "object",
          title: "Interface Audio",
          properties: {
            navigate: { type: "string" },
            confirm: { type: "string" },
            cancel: { type: "string" },
            open: { type: "string" },
            close: { type: "string" },
            error: { type: "string" },
          },
        },
      },
    },
    skills: {
      type: "array",
      title: "Skills",
      description: "Skills learned automatically when the hero reaches a level.",
      items: {
        type: "object",
        properties: {
          level: {
            type: "number",
            title: "Level",
            minimum: 1,
            default: 1,
          },
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
        required: ["level", "skillId"],
      },
    },
    ...inventorySchemas,
    ...parameterSchemas,
    startMapId: {
      type: "string",
      title: "Start Map",
      description: "The map where the game starts. This is the first map players will see when they start the game.",
      format: {
        hidden: true
      } as any
    },
  },
} as const;

export type Project = FromSchema<typeof projectSchema>;
export type ProjectData = Project & { _id: string };
