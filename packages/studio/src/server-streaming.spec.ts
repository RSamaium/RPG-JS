import { describe, expect, it, vi } from "vitest";
import createStudioServer from "./server";

interface LegacyMapPayload {
  id: string;
  config: Record<string, unknown>;
  events: unknown[];
  commonEvents: unknown[];
  data: {
    creationDetails: { version: string };
    params: {
      scale: number;
      weather?: unknown;
    };
    weather?: unknown;
    events: unknown[];
    commonEvents: unknown[];
  };
}

function createLegacyMapPayload(): LegacyMapPayload {
  return {
    id: "legacy-map",
    config: {},
    events: [],
    commonEvents: [],
    data: {
      creationDetails: { version: "v1" },
      params: { scale: 1 },
      events: [],
      commonEvents: [],
    },
  };
}

describe("Studio server map streaming configuration", () => {
  it("leaves custom map payloads untouched when built-in streaming is disabled", async () => {
    const module = createStudioServer({ streaming: false });
    const payload = createLegacyMapPayload();

    await expect(module.map?.onBeforeUpdate?.(payload, {} as any)).resolves.toBeDefined();
    expect(payload.data.creationDetails.version).toBe("v1");
  });

  it("still requires Studio v2 payloads when built-in streaming is enabled", async () => {
    const module = createStudioServer({ streaming: {} });

    await expect(
      module.map?.onBeforeUpdate?.(createLegacyMapPayload(), {} as any)
    ).rejects.toThrow(/must use format v2/);
  });

  it("initializes map weather stored in Studio params", async () => {
    const module = createStudioServer({ streaming: false });
    const payload = createLegacyMapPayload();
    const weather = {
      effect: "cloud",
      preset: "sunnySoftRays",
      params: {
        density: 0.62,
        sunIntensity: 1.05,
      },
    };
    payload.data.params.weather = weather;
    const map = {
      setWeather: vi.fn(),
    };

    await module.map?.onBeforeUpdate?.(payload, map as any);

    expect(payload.data.weather).toMatchObject({
      effect: "cloud",
      preset: "sunnySoftRays",
      params: {
        density: 0.62,
        sunIntensity: 1,
      },
    });
    expect(map.setWeather).toHaveBeenCalledWith(payload.data.weather);
  });

  it("puts the tags of the Studio map where RPGJS reads the tags of a map", async () => {
    const module = createStudioServer({ streaming: false });
    const tagged = { ...createLegacyMapPayload(), data: { ...createLegacyMapPayload().data, tags: ["town", "safe"] } } as LegacyMapPayload & { tags?: unknown };
    const untagged = createLegacyMapPayload() as LegacyMapPayload & { tags?: unknown };

    await module.map?.onBeforeUpdate?.(tagged, {} as any);
    await module.map?.onBeforeUpdate?.(untagged, {} as any);

    expect(tagged.tags).toEqual(["town", "safe"]);
    expect(untagged.tags).toEqual([]);
  });

  it("gives the runtime event the tags of the Studio event, next to its name", () => {
    const module = createStudioServer({ streaming: false });
    const map = { scale: 1 } as any;

    const tagged = module.event?.onBeforeCreated?.({ id: "npc", x: 0, y: 0, event: { name: "Aider un PNJ", tags: ["help"], triggers: [] } } as any, map) as any;
    const untagged = module.event?.onBeforeCreated?.({ id: "rock", x: 0, y: 0, event: { name: "rock", triggers: [] } } as any, map) as any;

    expect(tagged.event.name).toBe("Aider un PNJ");
    expect(tagged.event.tags).toEqual(["help"]);
    expect(untagged.event.tags).toBeUndefined();
  });
});
