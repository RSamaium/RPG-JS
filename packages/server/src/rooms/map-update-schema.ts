import { z } from "zod";

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
