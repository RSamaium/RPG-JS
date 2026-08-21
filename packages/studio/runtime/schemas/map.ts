import { FromSchema } from "json-schema-to-ts";
import { EventData, eventSchema } from "./event";
import { lightingStateNullableSchema } from "./lighting";
import { weatherStateNullableSchema } from "./weather";

export const mapParamsSchema = {
  type: "object",
  properties: {
    width: {
      type: "number",
      title: "Width (px)",
    },
    height: {
      type: "number",
      title: "Height (px)",
    },
    scale: {
      type: "number",
      title: "Scale",
      description: "Scale of the map",
      format: {
        minFractionDigits: 1,
        maxFractionDigits: 2,
        minValue: 0,
      },
    },
    backgroundMusic: {
      type: "string",
      title: "Background Music",
      description: "Background music of the map",
      format: {
        name: "media",
        type: "bgm",
        buttonLabel: "Select Background Music",
        useUpload: {
          accept: "audio/*",
        },
        // useAiGenerate: {
        //   onGenerate(prompt: string) {
        //     console.log(prompt);
        //   },
        //   creditCost: creditCost.backgroundMusic.creditCost,
        // },
      },
    },
    backgroundAmbientSound: {
      type: "string",
      title: "Background Ambient Sound",
      description: "Background ambient sound of the map",
      format: {
        name: "media",
        type: "bgs",
        buttonLabel: "Select Background Ambient Sound",
        useUpload: {
          accept: "audio/*",
        },
        // useAiGenerate: {
        //   onGenerate(prompt: string) {
        //     console.log(prompt);
        //   },
        //   creditCost: creditCost.backgroundAmbientSound.creditCost,
        // },
      },
    },
  },
};

export const waterAnimationSchema = {
  type: "object",
  title: "Water Animation",
  description: "Optional animated water overlay for Studio terrain rendering.",
  properties: {
    enabled: {
      type: "boolean",
      title: "Enabled",
      description: "Enable animated painted water on this map. Filled terrain holes animate automatically.",
      default: false,
    },
    speed: {
      type: "number",
      title: "Speed",
      description: "Map default for how fast liquid movement animates. Filled holes may override it.",
      default: 1,
      minimum: 0.1,
      maximum: 4,
    },
    intensity: {
      type: "number",
      title: "Intensity",
      description: "Map default for animation strength. Zero keeps the liquid static.",
      default: 0.45,
      minimum: 0,
      maximum: 1,
    },
    direction: {
      type: "number",
      title: "Direction",
      description: "Map default travel angle in degrees: 0 is right and 90 is down.",
      default: 90,
      minimum: 0,
      maximum: 360,
    },
  },
  required: ["enabled"],
} as const;

export const mapSchema = {
  type: "object",
  properties: {
    creationDetails: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          title: "Prompt",
          description: "The prompt of the map",
        },
        mapStyle: {
          type: "string",
          title: "Map Style",
          description: "The style of the map",
        },
        state: {
          type: "string",
          title: "State",
          description: "The state of the map",
        },
      },
    },
    name: {
      type: "string",
      title: "Name",
      description: "The name of the map",
    },
    data: {
      type: "string",
      title: "Data",
      description: "The data of the map",
      format: "textarea",
    },
    fullImage: {
      type: "string",
      title: "Full Image",
      description: "The full image of the map",
    },
    gridImage: {
      type: "string",
      title: "Grid Image",
      description: "The grid image of the map",
    },
    layers: {
      type: "object",
      properties: {
        terrain: {
          type: "string",
          title: "Terrain",
          description: "The terrain layer of the map",
        },
        collision: {
          type: "string",
          title: "Collision",
          description: "The collision layer of the map",
        },
        objects: {
          type: "string",
          title: "Objects",
          description: "The objects layer of the map",
        },
      },
    },
    params: mapParamsSchema as any,
    tiled: {
      type: "object",
      properties: {
        data: {
          type: "string",
        },
        image: {
          type: "string",
          title: "Tiled Image",
        },
      },
    },
    terrain: {
      type: "string",
      title: "Terrain",
      description: "The terrain of the map",
    },
    weather: weatherStateNullableSchema as any,
    lighting: lightingStateNullableSchema as any,
    mapLoadBlockCollectionId: {
      type: ["string", "null"],
      title: "Map Entry Workflow",
      description: "Optional block collection executed when a player enters the map",
    },
    waterAnimation: waterAnimationSchema as any,
    elementsAlwaysLow: {
      type: "string",
      title: "Elements Always Low",
      description: "The elements always low of the map (rendered before characters, no hitboxes)",
    },
    elementsLow: {
      type: "string",
      title: "Elements Low",
      description: "The elements low of the map (rendered with characters, with hitboxes)",
    },
    elementsHigh: {
      type: "string",
      title: "Elements High",
      description: "The elements high of the map",
    },
    version: {
      type: "string",
      title: "Version",
      description: "The version of the map",
    },
    hitboxes: {
      type: "array",
      title: "Hitbox",
      description: "The hitbox of the map",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            title: "ID",
            description: "Unique identifier for the hitbox",
          },
          x: {
            type: "number",
            title: "X",
            description: "The x coordinate of the hitbox",
          },
          y: {
            type: "number",
            title: "Y",
            description: "The y coordinate of the hitbox",
          },
          width: {
            type: "number",
            title: "Width",
            description: "The width of the hitbox",
          },
          height: {
            type: "number",
            title: "Height",
            description: "The height of the hitbox",
          },
          points: {
            type: "array",
            title: "Points",
            description: "Array of [x, y] coordinates for polygon hitboxes",
            items: {
              type: "array",
              items: {
                type: "number",
              },
              minItems: 2,
              maxItems: 2,
            },
          },
        },
      },
    },
    polygons: {
      type: "array",
      title: "Polygons",
      description: "The polygons of the map",
      items: {
        type: "array",
        items: {
          type: "array",
          items: {
            type: "number",
          },
          minItems: 2,
          maxItems: 2,
        },
      },
    },
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            title: "Event",
            $ref: "#/functions/event",
            format: {
              add: {
                schema: eventSchema,
              },
            } as any,
          },
          x: {
            type: "number",
            title: "X",
            description: "The x coordinate of the event",
          },
          y: {
            type: "number",
            title: "Y",
            description: "The y coordinate of the event",
          },
        },
      },
    },
    start: {
      type: "object",
      properties: {
        x: {
          type: "number",
          title: "X",
        },
        y: {
          type: "number",
          title: "Y",
        },
      },
    },
    thumbnail: {
      type: "string",
      title: "Thumbnail",
      description: "The thumbnail of the map",
    },
    worldX: {
      type: "number",
      title: "World X",
      description: "The X coordinate of the map in the world",
    },
    worldY: {
      type: "number",
      title: "World Y",
      description: "The Y coordinate of the map in the world",
    },
  },
} as const;

export type Map = FromSchema<typeof mapSchema>;
export type MapData = Map & { _id: string };
export type EventInMap = {
  eventId: EventData;
  x: number;
  y: number;
};
