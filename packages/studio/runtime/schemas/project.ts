import { FromSchema } from "json-schema-to-ts";
import { createAppearanceSchema, parameterSchemas, inventorySchemas } from "./character-config";
import { skillSchema } from "./database";

const keyEnum = ["down", "up", "left", "right", "space", "backspace", "tab", "shift", "control", "alt", "meta", "capslock", "numlock", "scrolllock", "printscreen", "pause", "insert", "delete", "home", "end", "pageup", "pagedown", "arrowup", "arrowdown", "arrowleft", "arrowright", "escape", "enter", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"] as const;

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
          enum: keyEnum,
          default: "down",
        },
        up: {
          type: "string",
          title: "Up",
          enum: keyEnum,
          default: "up",
        },
        left: {
          type: "string",
          title: "Left",
          enum: keyEnum,
          default: "left",
        },
        right: {
          type: "string",
          title: "Right",
          enum: keyEnum,
          default: "right",
        },
        action: {
          type: "string",
          title: "Action",
          enum: keyEnum,
          default: "space",
        },
        back: {
          type: "string",
          title: "Back",
          enum: keyEnum,
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
        skill: { type: "string", title: "Skill Sound", format: { name: "media", type: "sound" } as any },
        hit: { type: "string", title: "Hit Sound", format: { name: "media", type: "sound" } as any },
        hurt: { type: "string", title: "Hurt Sound", format: { name: "media", type: "sound" } as any },
        die: { type: "string", title: "Defeat Sound", format: { name: "media", type: "sound" } as any },
        fadeInMs: { type: "number", title: "Battle Fade In (ms)", default: 600, minimum: 0 },
        fadeOutMs: { type: "number", title: "Battle Fade Out (ms)", default: 900, minimum: 0 },
        exitDelayMs: { type: "number", title: "Combat Exit Delay (ms)", default: 1500, minimum: 0 },
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
