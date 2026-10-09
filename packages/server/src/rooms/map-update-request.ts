import type { WorldMapConfig } from "@rpgjs/common";
import { z } from "zod";
import { COEFFICIENT_ELEMENTS, DAMAGE_CRITICAL, DAMAGE_PHYSIC, DAMAGE_SKILL } from "../presets";
import { MAP_UPDATE_TOKEN_ENV, MAP_UPDATE_TOKEN_HEADER } from "../map-update";

/**
 * Zod schema for validating map update request body
 * 
 * This schema ensures that the required fields are present and properly typed
 * when updating a map configuration.
 */
export const MapUpdateSchema = z.object({
  /** Configuration object for the map (optional) */
  config: z.any().optional(),
  /** Damage formulas configuration (optional) */
  damageFormulas: z.any().optional(),
  /** Unique identifier for the map (required) */
  id: z.string(),
  /** Width of the map in pixels (required) */
  width: z.number(),
  /** Height of the map in pixels (required) */
  height: z.number(),
  /** Map events to spawn (optional) */
  events: z.array(z.any()).optional(),
  /** Optional static hitboxes (custom maps) */
  hitboxes: z.array(z.any()).optional(),
  /** Optional named positions resolved by map integrations such as Tiled */
  positions: z.record(z.string(), z.any()).optional(),
  /** Parsed tiled map payload (optional) */
  parsedMap: z.any().optional(),
  /** Raw map source payload (optional) */
  data: z.any().optional(),
  /**
   * Server-owned game database published with the map (optional).
   *
   * Studio publishes either its record array or an already normalized record.
   * Keeping it in the validated payload lets database hooks populate the room
   * without an HTTP fallback and preserves it across room restoration.
   */
  database: z.union([
    z.array(z.any()),
    z.record(z.string(), z.any()),
  ]).optional(),
  /** Optional map params payload */
  params: z.any().optional(),
});

/**
 * 401 response returned by the administrative map and world update endpoints.
 */
export function unauthorizedUpdateResponse(kind: "map" | "world", path: string): Response {
  return new Response(JSON.stringify({
    error: `Unauthorized ${kind} update`,
    message: `Provide ${MAP_UPDATE_TOKEN_HEADER} or Authorization: Bearer <token> to call ${path} when ${MAP_UPDATE_TOKEN_ENV} is set.`,
  }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Default damage formulas, overridden by the formulas published with the map.
 */
export function withDefaultDamageFormulas(damageFormulas: Record<string, any> | undefined): Record<string, any> {
  return {
    damageSkill: DAMAGE_SKILL,
    damagePhysic: DAMAGE_PHYSIC,
    damageCritical: DAMAGE_CRITICAL,
    coefficientElements: COEFFICIENT_ELEMENTS,
    ...(damageFormulas || {}),
  };
}

/**
 * Read the world id from a world update URL.
 *
 * The URL can be either the room-local path or the complete
 * `/parties/<namespace>/<room>/world/:id/update` transport path.
 */
export function parseWorldIdFromUpdateUrl(url: string | undefined): string {
  try {
    const urlObj = new URL(url as string, "http://localhost");
    const match = urlObj.pathname.match(/\/world\/([^/]+)\/update\/?$/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

/**
 * Normalize a world update payload (`WorldMapConfig[]` or `{ maps }`).
 * Missing sizes fall back to the current map data.
 */
export function normalizeWorldMapConfigs(
  payload: unknown,
  fallback: { width?: number; height?: number; tileWidth?: number; tileHeight?: number },
): WorldMapConfig[] {
  const mapsConfig: any[] = Array.isArray(payload)
    ? payload
    : (payload as { maps?: any[] } | null)?.maps ?? [];

  return mapsConfig.map((m: any) => ({
    id: m.id,
    worldX: m.worldX ?? m.x ?? 0,
    worldY: m.worldY ?? m.y ?? 0,
    width: m.width ?? m.widthPx ?? fallback.width ?? 0,
    height: m.height ?? m.heightPx ?? fallback.height ?? 0,
    tileWidth: m.tileWidth ?? fallback.tileWidth ?? 32,
    tileHeight: m.tileHeight ?? fallback.tileHeight ?? 32,
  }) as WorldMapConfig);
}
