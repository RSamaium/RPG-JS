import { FromSchema } from "json-schema-to-ts";

const commonEventPageSchema = {
    type: "object",
    properties: {
        id: { type: "string" },
        conditions: { type: "object", additionalProperties: true },
        typeData: { type: "object", additionalProperties: true },
        graphic: {},
        faceset: {},
        direction: { type: "string" },
        pattern: { type: "string" },
        movement: { type: "object", additionalProperties: true },
        trigger: { type: "string" },
        blockCollectionId: { type: "string" },
        enabled: { type: "boolean" },
        options: { type: "object", additionalProperties: true },
    },
    additionalProperties: true,
} as const;

export const databaseSchema = {
    type: "object",
    properties: {
        name: {
            type: "string",
            title: "Name",
            format: { layout: "basic" },
        },
        description: {
            type: "string",
            title: "Description",
            format: { layout: "basic", type: "textarea" },
        },
    },
} as any;

export const itemSchema = {
    type: "object",
    properties: {
        name: {
            type: "string",
            title: "Name",
            format: { layout: "basic" },
        },
        description: {
            type: "string",
            title: "Description",
            format: { name: "textarea" },
        },
        icon: {
            type: "string",
            title: "Icon",
            description: "Media icon associated with this item",
            format: {
                name: "media",
                type: "icon",
                buttonLabel: "Select Icon",
                useUpload: {
                    accept: "image/*",
                }
            } as any,
        },
        itemType: {
            type: "string",
            title: "Item Type",
            enum: ["item", "weapon", "armor"],
            description: "The type of item",
            default: "item",
            format: { layout: "properties" },
        },
        price: {
            type: "number",
            title: "Price",
            description: "The price of the item. If the item is not for sale, set the price to 0.",
            default: 0,
            format: { layout: "properties" },
        }
    },
    required: ["name", "itemType"],
    allOf: [
        {
            if: {
                properties: { itemType: { const: "weapon" } }
            },
            then: {
                properties: {
                    atk: {
                        type: "number",
                        title: "Attack Power",
                        description: "The attack power of the weapon",
                        default: 0,
                        format: { layout: "specific" },
                    },
                    element: {
                        type: "string",
                        title: "Element",
                        description: "The element type of the weapon",
                        enum: ["none", "fire", "water", "earth", "wind", "light", "dark"],
                        default: "none",
                        format: { layout: "specific" },
                    },
                    weaponType: {
                        type: "string",
                        title: "Weapon Type",
                        description: "The type of weapon",
                        enum: ["sword", "axe", "spear", "bow", "staff", "dagger"],
                        default: "sword",
                        format: { layout: "specific" },
                    },
                },
                required: ["atk"],
            },
            else: {
                if: {
                    properties: { itemType: { const: "armor" } }
                },
                then: {
                    properties: {
                        pdef: {
                            type: "number",
                            title: "Defense",
                            description: "The defense value of the armor",
                            default: 0,
                            format: { layout: "specific" },
                        },
                        armorType: {
                            type: "string",
                            title: "Armor Type",
                            description: "The type of armor",
                            enum: ["helmet", "chest", "gloves", "boots", "shield"],
                            default: "chest",
                            format: { layout: "specific" },
                        },
                        
                    },
                    required: ["pdef"],
                }
            },
        },
    ],
} as any;

export const stateSchema = {
    type: "object",
    properties: {
        name: {
            type: "string",
            title: "Name",
            format: { layout: "basic" },
        },
        description: {
            type: "string",
            title: "Description",
            format: { layout: "basic", type: "textarea" },
        },
        icon: {
            type: "string",
            title: "Icon",
            description: "The icon identifier for the state",
            format: { layout: "basic" },
        },
        duration: {
            type: "number",
            title: "Duration",
            description: "Duration in turns (0 = permanent)",
            default: 0,
            format: { layout: "basic" },
        },
        effects: {
            type: "object",
            title: "Effects",
            format: { layout: "effects" },
            properties: {
                attack: { type: "number", default: 0 },
                defense: { type: "number", default: 0 },
                magic: { type: "number", default: 0 },
                speed: { type: "number", default: 0 },
                hp: { type: "number", default: 0 },
                mp: { type: "number", default: 0 },
            },
        },
        elementResistance: {
            type: "object",
            title: "Element Resistance",
            format: { layout: "resistance" },
            properties: {
                fire: { type: "number", default: 0 },
                water: { type: "number", default: 0 },
                earth: { type: "number", default: 0 },
                wind: { type: "number", default: 0 },
                light: { type: "number", default: 0 },
                dark: { type: "number", default: 0 },
            },
        },
        removable: {
            type: "boolean",
            title: "Removable",
            description: "Whether the state can be removed by items or skills",
            default: true,
            format: { layout: "basic" },
        },
    },
    required: ["name"],
} as any;

export const skillSchema = {
    type: "object",
    properties: {
        name: {
            type: "string",
            title: "Name",
            format: { layout: "basic" },
        },
        description: {
            type: "string",
            title: "Description",
            format: { layout: "basic", type: "textarea" },
        },
        icon: {
            type: "string",
            title: "Icon",
            description: "Media icon associated with this skill",
            format: {
                name: "media",
                type: "icon",
                buttonLabel: "Select Icon",
                useUpload: {
                    accept: "image/*",
                },
                layout: "basic",
            } as any,
        },
        animation: {
            type: "string",
            title: "Animation",
            description: "Media animation played by this skill",
            format: {
                name: "media",
                type: "animation",
                buttonLabel: "Select Animation",
                useUpload: {
                    accept: "image/*",
                },
                layout: "basic",
            } as any,
        },
        sound: {
            type: "string",
            title: "Sound",
            description: "Sound effect played by this skill",
            format: {
                name: "media",
                type: "sound",
                buttonLabel: "Select Sound Effect",
                useUpload: {
                    accept: "audio/*",
                },
                layout: "basic",
            } as any,
        },
        spCost: {
            type: "number",
            title: "SP Cost",
            description: "The SP cost to use this skill",
            default: 0,
            format: { layout: "combat" },
        },
        power: {
            type: "number",
            title: "Power",
            description: "The power of the skill",
            default: 0,
            format: { layout: "combat" },
        },
        element: {
            type: "string",
            title: "Element",
            description: "The element type of the skill",
            enum: ["none", "fire", "water", "earth", "wind", "light", "dark"],
            default: "none",
            format: { layout: "combat" },
        },
        skillType: {
            type: "string",
            title: "Skill Type",
            description: "The type of skill",
            enum: ["physical", "magical", "support", "healing"],
            default: "physical",
            format: { layout: "combat" },
        },
        target: {
            type: "string",
            title: "Target",
            description: "The target of the skill",
            enum: ["single", "all", "self", "ally", "enemy"],
            default: "single",
            format: { layout: "target" },
        },
        range: {
            type: "number",
            title: "Range",
            description: "The range of the skill (0 = melee)",
            default: 0,
            format: { layout: "target" },
        },
        successRate: {
            type: "number",
            title: "Success Rate",
            description: "The success rate percentage (0-100)",
            default: 100,
            minimum: 0,
            maximum: 100,
            format: { layout: "target" },
        },
    },
    required: ["name", "spCost", "power"],
} as any;

export const variableSchema = {
    type: "object",
    properties: {
        name: {
            type: "string",
            title: "Name",
          
        },
        description: {
            type: "string",
            title: "Description",
            format: {  name: "textarea" },
        },
    },
     required: ["name"]
} as any;

export const commonEventSchema = {
    type: "object",
    properties: {
        name: {
            type: "string",
            title: "Name",
            format: { layout: "basic" },
        },
        description: {
            type: "string",
            title: "Description",
            format: { name: "textarea", layout: "basic" },
        },
        pages: {
            type: "array",
            title: "Pages",
            description: "Reusable event pages for this common event",
            items: commonEventPageSchema,
        },
        triggers: {
            type: "array",
            title: "Triggers",
            description: "Runtime event page triggers generated from pages",
            items: {
                type: "object",
                properties: {
                    type: { type: "string" },
                    blockCollectionId: { type: "string" },
                    enabled: { type: "boolean" },
                    conditions: { type: "object", additionalProperties: true },
                    typeData: { type: "object", additionalProperties: true },
                    graphic: {},
                    faceset: {},
                    direction: { type: "string" },
                    pattern: { type: "string" },
                    movement: { type: "object", additionalProperties: true },
                    options: { type: "object", additionalProperties: true },
                },
                additionalProperties: true,
            },
        },
        parameters: {
            type: "array",
            title: "Parameters",
            description: "Optional key/value parameter definitions available to common event blocks",
            items: {
                type: "object",
                properties: {
                    key: { type: "string", title: "Key" },
                    defaultValue: { title: "Default Value" },
                },
                required: ["key"],
            },
        },
    },
    required: ["name"],
} as any;

export type Database = FromSchema<typeof databaseSchema>;
export type Item = FromSchema<typeof itemSchema>;
export type ItemData = Item & { _id: string };
export type State = FromSchema<typeof stateSchema>;
export type StateData = State & { _id: string };
export type Skill = FromSchema<typeof skillSchema>;
export type SkillData = Skill & { _id: string };
export type Variable = FromSchema<typeof variableSchema>;
export type VariableData = Variable & { _id: string };
export type CommonEvent = FromSchema<typeof commonEventSchema>;
export type CommonEventData = CommonEvent & { _id: string };
