export const lightSpotSchema = {
  type: "object",
  title: "Light Spot",
  properties: {
    id: {
      type: "string",
      title: "ID",
    },
    x: {
      type: "number",
      title: "X",
      description: "World X coordinate of the light center.",
    },
    y: {
      type: "number",
      title: "Y",
      description: "World Y coordinate of the light center.",
    },
    radius: {
      type: "number",
      title: "Radius",
      default: 180,
    },
    intensity: {
      type: "number",
      title: "Intensity",
      default: 1,
    },
    color: {
      type: "string",
      title: "Color",
      default: "#ffffff",
    },
    flicker: {
      type: "boolean",
      title: "Flicker",
      default: false,
    },
    flickerSpeed: {
      type: "number",
      title: "Flicker Speed",
      default: 12,
    },
    pulse: {
      type: "boolean",
      title: "Pulse",
      default: false,
    },
    pulseSpeed: {
      type: "number",
      title: "Pulse Speed",
      default: 2,
    },
    halo: {
      type: "number",
      title: "Halo",
      description: "Glow of the light in the air, 0 to 1. Used by the day night cycle.",
      minimum: 0,
      maximum: 1,
    },
    schedule: {
      type: "array",
      title: "Schedule",
      description: "Hours [on, off] the light is on (it may cross midnight). Used by the day night cycle.",
      items: { type: "number", minimum: 0, maximum: 24 },
      minItems: 2,
      maxItems: 2,
    },
  },
  required: ["x", "y"],
} as const;

export const lightingStateSchema = {
  type: "object",
  title: "Lighting",
  properties: {
    ambient: {
      type: "object",
      title: "Ambient",
      properties: {
        darkness: {
          type: "number",
          title: "Darkness",
          description: "Darkness outside light spots. 0 is daylight, 1 is full black.",
          default: 0.75,
        },
        darkColor: {
          type: "string",
          title: "Dark Color",
          default: "#0a1020",
        },
        fogColor: {
          type: "string",
          title: "Fog Color",
          default: "#141a2a",
        },
        fogRadius: {
          type: "number",
          title: "Fog Radius",
          default: 0.5,
        },
        fogSoftness: {
          type: "number",
          title: "Fog Softness",
          default: 0.35,
        },
        fogOpacity: {
          type: "number",
          title: "Fog Opacity",
          default: 0.35,
        },
      },
    },
    spots: {
      type: "array",
      title: "Light Spots",
      items: lightSpotSchema,
    },
    sun: {
      type: "object",
      title: "Sun",
      description: "Directional sunlight. When enabled with positive intensity, it automatically enables sprite and Studio wall shadows unless shadows.enabled is false.",
      properties: {
        x: { type: "number", title: "X" },
        y: { type: "number", title: "Y" },
        z: { type: "number", title: "Z", default: 520 },
        radius: { type: "number", title: "Radius" },
        intensity: { type: "number", title: "Intensity", default: 0.85 },
        shadowWeight: { type: "number", title: "Shadow Weight", default: 1 },
        enabled: { type: "boolean", title: "Enabled", default: true },
      },
    },
    dayNight: {
      type: "object",
      title: "Day Night Cycle",
      description: "Color grades the scene by the hour of an in-game clock instead of a darkness overlay. Light spots are lit at night, or on their own schedule.",
      properties: {
        enabled: { type: "boolean", title: "Enabled", default: false },
        time: { type: "number", title: "Start Hour", description: "0 to 24 (decimals are minutes: 18.5 is 18:30).", default: 12 },
        speed: { type: "number", title: "Clock Speed", description: "Game minutes elapsed per real second.", default: 1 },
        paused: { type: "boolean", title: "Paused", default: false },
        lightIntensity: { type: "number", title: "Light Intensity", description: "Multiplies every light intensity.", default: 1 },
        vignette: { type: "number", title: "Vignette", description: "Multiplies the edge darkening.", default: 1 },
      },
    },
    shadows: {
      type: "object",
      title: "Shadows",
      description: "Shadow rendering options. Set enabled to false to opt out of automatic sun shadows.",
      properties: {
        enabled: {
          type: "boolean",
          title: "Enabled",
          default: true,
        },
        mode: {
          type: "string",
          title: "Mode",
          enum: ["strongest", "blend2"],
          default: "strongest",
        },
        updateHz: {
          type: "number",
          title: "Update Hz",
          default: 30,
        },
        scanHz: {
          type: "number",
          title: "Scan Hz",
          default: 8,
        },
        cullToViewport: {
          type: "boolean",
          title: "Cull To Viewport",
          default: true,
        },
        minInfluence: {
          type: "number",
          title: "Minimum Influence",
          default: 0.16,
        },
        falloffPower: {
          type: "number",
          title: "Falloff Power",
          default: 1.2,
        },
        ambientLight: {
          type: ["object", "null"],
          title: "Ambient Light",
          properties: {
            x: { type: "number", title: "X", default: -0.18 },
            y: { type: "number", title: "Y", default: -1 },
            z: { type: "number", title: "Z", default: 420 },
            intensity: { type: "number", title: "Intensity", default: 0.18 },
            shadowWeight: { type: "number", title: "Shadow Weight", default: 0.75 },
            length: { type: "number", title: "Length" },
            enabled: { type: "boolean", title: "Enabled", default: true },
          },
        },
        shadowColor: {
          type: "string",
          title: "Shadow Color",
          default: "#05070d",
        },
      },
    },
  },
} as const;

export const lightingStateNullableSchema = {
  ...lightingStateSchema,
  type: ["object", "null"],
  title: "Lighting",
  description: "Optional lighting state for the map",
} as const;
