import { Direction } from "../Player";

/**
 * Interface for world map information
 */
export interface WorldMapInfo {
  id: string;
  x: number;           // World X position 
  y: number;           // World Y position
  width: number;       // Width in pixels
  height: number;      // Height in pixels
  worldX: number;      // World X coordinate (alias for x)
  worldY: number;      // World Y coordinate (alias for y)
  widthPx: number;     // Width in pixels (alias for width)
  heightPx: number;    // Height in pixels (alias for height)
  tileWidth: number;   // Tile width
  tileHeight: number;  // Tile height
}

/**
 * Configuration for a world map
 */
export interface WorldMapConfig {
  id: string;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  tileWidth?: number;
  tileHeight?: number;
}

type WorldMapSource = {
  id?: string;
  worldX: number;
  worldY: number;
  widthPx: number;
  heightPx: number;
  tileWidth?: number;
  tileHeight?: number;
};

/**
 * World Maps Manager
 * 
 * Manages a collection of interconnected maps and their spatial relationships
 */
export class WorldMapsManager {
  private maps: Map<string, WorldMapInfo> = new Map();
  private spatialIndex: Map<string, string> = new Map(); // "x,y" -> mapId

  /**
   * Configure the world maps
   * 
   * @param configs - Array of map configurations
   * 
   * @example
   * ```ts
   * const worldMaps = new WorldMapsManager();
   * worldMaps.configure([
   *   { id: "town", worldX: 0, worldY: 0, width: 1024, height: 768 },
   *   { id: "forest", worldX: 1024, worldY: 0, width: 1024, height: 768 }
   * ]);
   * ```
   */
  configure(configs: WorldMapConfig[]) {
    this.maps.clear();
    this.spatialIndex.clear();

    for (const config of configs) {
      const worldMap: WorldMapInfo = {
        id: config.id,
        x: config.worldX,
        y: config.worldY,
        width: config.width,
        height: config.height,
        worldX: config.worldX,
        worldY: config.worldY,
        widthPx: config.width,
        heightPx: config.height,
        tileWidth: config.tileWidth ?? 32,
        tileHeight: config.tileHeight ?? 32,
      };

      this.maps.set(config.id, worldMap);
      this.spatialIndex.set(`${config.worldX},${config.worldY}`, config.id);
    }
  }

  /**
   * Remove a map from the world by its id
   * 
   * Deletes the map from the internal registry and spatial index.
   * 
   * @param mapId - Map identifier
   * @returns True if a map was removed, false otherwise
   * 
   * @example
   * ```ts
   * const removed = world.removeMap("forest");
   * ```
   */
  removeMap(mapId: string): boolean {
    const map = this.maps.get(mapId);
    if (!map) return false;
    this.maps.delete(mapId);
    this.spatialIndex.delete(`${map.worldX},${map.worldY}`);
    return true;
  }

  /**
   * Find adjacent maps based on various search strategies
   * 
   * Supports three search modes:
   * - PositionBox: collect maps intersecting the given box
   * - Direction: collect maps adjacent in the given direction
   * - Point: collect the map containing the given world point
   * 
   * The given `map` can be any object exposing `worldX`, `worldY`, `widthPx`, `heightPx`
   * and optional `tileWidth`, `tileHeight` properties (e.g. your `RpgMap` instance or a `WorldMapInfo`).
   * 
   * @param map - The source map
   * @param search - Search strategy (box, direction or point)
   * @returns Array of matching adjacent map infos
   * 
   * @example
   * ```ts
   * // Point
   * world.getAdjacentMaps(currentMap, { x: 1024, y: 0 });
   * 
   * // Direction
   * world.getAdjacentMaps(currentMap, Direction.Up);
   * 
   * // Box
   * world.getAdjacentMaps(currentMap, { minX: 0, minY: 0, maxX: 2048, maxY: 1024 });
   * ```
   */
  getAdjacentMaps(
    map: WorldMapSource,
    search:
      | { minX: number; minY: number; maxX: number; maxY: number }
      | { x: number; y: number }
      | Direction
      | number
  ): WorldMapInfo[] {
    const maps = Array.from(this.maps.values());
    const direction = typeof search === 'number'
      ? ([Direction.Up, Direction.Down, Direction.Left, Direction.Right] as const)[search]
      : typeof search === 'string'
        ? search
        : undefined;

    // Direction lookup -----------------------------------------------------
    if (direction) {
      const src = map;
      return maps.filter(m => {
        // Check if maps overlap or touch in the perpendicular direction
        // For vertical directions (Up/Down), we need horizontal overlap or touch
        // For horizontal directions (Left/Right), we need vertical overlap or touch
        if (m.id === src.id) {
          return false;
        }

        const horizontallyOverlapsOrTouches =
          Math.max(src.worldX, m.worldX) <= Math.min(src.worldX + src.widthPx, m.worldX + m.widthPx);
        const verticallyOverlapsOrTouches =
          Math.max(src.worldY, m.worldY) <= Math.min(src.worldY + src.heightPx, m.worldY + m.heightPx);
  
        switch (direction) {
          case Direction.Up:
            return horizontallyOverlapsOrTouches && m.worldY + m.heightPx === src.worldY;
          case Direction.Down:
            return horizontallyOverlapsOrTouches && m.worldY === src.worldY + src.heightPx;
          case Direction.Left:
            return verticallyOverlapsOrTouches && m.worldX + m.widthPx === src.worldX;
          case Direction.Right:
            return verticallyOverlapsOrTouches && m.worldX === src.worldX + src.widthPx;
          default:
            return false;
        }
      });
    }

    if (typeof search !== 'object') {
      return [];
    }

    // Point lookup ----------------------------------------------------------
    if ('x' in search && 'y' in search) {
      const found = maps.find(m =>
        search.x >= m.worldX && search.x < m.worldX + m.widthPx &&
        search.y >= m.worldY && search.y < m.worldY + m.heightPx
      );
      return found ? [found] : [];
    }

    // Box lookup ------------------------------------------------------------
    if ('minX' in search) {
      const { minX, minY, maxX, maxY } = search;
      return maps.filter(m => {
        const aLeft = m.worldX;
        const aRight = m.worldX + m.widthPx;
        const aTop = m.worldY;
        const aBottom = m.worldY + m.heightPx;
        const bLeft = minX;
        const bRight = maxX;
        const bTop = minY;
        const bBottom = maxY;
        const overlapX = aLeft < bRight && aRight > bLeft;
        const overlapY = aTop < bBottom && aBottom > bTop;
        return overlapX && overlapY;
      });
    }

    return [];
  }

  /**
   * Get map information by ID
   * 
   * @param mapId - Map ID
   * @returns Map information or null if not found
   * 
   * @example
   * ```ts
   * const mapInfo = worldMaps.getMapInfo("forest");
   * ```
   */
  getMapInfo(mapId: string): WorldMapInfo | null {
    return this.maps.get(mapId) ?? null;
  }

  /**
   * Get all configured maps
   * 
   * @returns Array of all world maps
   */
  getAllMaps(): WorldMapInfo[] {
    return Array.from(this.maps.values());
  }

  /**
   * Find map by world coordinates
   * 
   * @param worldX - World X coordinate
   * @param worldY - World Y coordinate
   * @returns Map found or null
   */
  getMapByWorldCoordinates(worldX: number, worldY: number): WorldMapInfo | null {
    const mapId = this.spatialIndex.get(`${worldX},${worldY}`);
    return mapId ? this.maps.get(mapId) ?? null : null;
  }

  /**
   * Calculate absolute world position of a player
   * 
   * @param map - Current map
   * @param localX - Local X position in the map
   * @param localY - Local Y position in the map
   * @returns Absolute coordinates in the world
   */
  getWorldPosition(map: WorldMapInfo, localX: number, localY: number): {x: number, y: number} {
    return {
      x: map.worldX + localX,
      y: map.worldY + localY
    };
  }

  /**
   * Calculate local position from world position
   * 
   * @param worldX - World X position
   * @param worldY - World Y position
   * @param targetMap - Target map
   * @returns Local position in the target map
   */
  getLocalPosition(worldX: number, worldY: number, targetMap: WorldMapInfo): {x: number, y: number} {
    return {
      x: worldX - targetMap.worldX,
      y: worldY - targetMap.worldY
    };
  }
}

/**
 * Public alias for the world maps manager
 * 
 * This alias is provided for API readability in map methods.
 */
export type RpgWorldMaps = WorldMapsManager;
