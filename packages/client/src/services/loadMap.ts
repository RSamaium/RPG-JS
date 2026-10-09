import { Context, inject } from "@signe/di";
import { UpdateMapToken, UpdateMapService, type LightingState, type RpgContext, type RpgProvider } from "@rpgjs/common";
import type { RpgClientMap } from "../Game/Map";

export const LoadMapToken = 'LoadMapToken'

/**
 * Represents the structure of map data that should be returned by the load map callback.
 * This interface defines all the properties that can be provided when loading a custom map.
 * 
 * @interface MapData
 */
export type MapData = {
  /** Raw map data that will be passed to the map component */
  data: any;
  /** CanvasEngine component that will render the map */
  component: any;
  /** Optional map width in pixels, used for viewport calculations */
  width?: number;
  /** Optional map height in pixels, used for viewport calculations */
  height?: number;
  /** Optional map events data (NPCs, interactive objects, etc.) */
  events?: any;
  /** Optional named positions, for example Tiled point objects used by changeMap("map", "name") */
  positions?: Record<string, { x: number; y: number; z?: number }>;
  /** Optional map identifier, defaults to the mapId parameter if not provided */
  id?: string;
  /** Optional initial lighting state for the loaded map */
  lighting?: LightingState | null;
  /** Optional render parameters passed to the map component. */
  params?: Record<string, unknown>;
  /** Internal controller used by a progressive map provider. */
  streamController?: { attach(map: RpgClientMap): void; detach(): void };
}

/**
 * Callback function type for loading map data.
 * This function receives a map ID and should return either a MapData object directly
 * or a Promise that resolves to a MapData object.
 * 
 * @callback LoadMapOptions
 * @param {string} mapId - The identifier of the map to load
 * @returns {Promise<MapData> | MapData} The map data object or a promise resolving to it
 */
export type LoadMapOptions = (mapId: string) => Promise<MapData> | MapData 

export class LoadMapService {
  private updateMapService: UpdateMapService;

  constructor(private context: RpgContext, private options: LoadMapOptions) {
    if (context.side === 'server') {
      return
    }
  }

  initialize(): void {}

  async load(mapId: string) {
    this.updateMapService ??= inject(this.context as Context, UpdateMapToken);
    const map = await this.options(mapId.replace('map-', ''))
    await this.updateMapService.update(map);
    return map;
  }
}

/**
 * Creates a dependency injection configuration for custom map loading on the client side.
 * 
 * This function allows you to customize how maps are loaded and displayed by providing
 * a callback that defines custom map data and rendering components. It's designed to work
 * with the RPG-JS dependency injection system and enables integration of custom map formats
 * like Tiled TMX files or any other map data structure.
 * 
 * The function sets up the necessary service providers for map loading, including:
 * - UpdateMapToken: Handles map updates in the client context
 * - LoadMapToken: Provides the LoadMapService with your custom loading logic
 * 
 * **Design Concept:**
 * The function follows the provider pattern, creating a modular way to inject custom
 * map loading behavior into the RPG-JS client engine. It separates the concern of
 * map data fetching from map rendering, allowing developers to focus on their specific
 * map format while leveraging the engine's rendering capabilities.
 * 
 * @param {LoadMapOptions} options - Callback function that handles map loading logic
 * @returns {Array<Object>} Array of dependency injection provider configurations
 * 
 * @example
 * ```typescript
 * import { provideLoadMap } from '@rpgjs/client'
 * import { createModule } from '@rpgjs/common'
 * import MyTiledMapComponent from './MyTiledMapComponent.ce'
 * 
 * // Basic usage with JSON map data
 * export function provideCustomMap() {
 *   return createModule("CustomMap", [
 *     provideLoadMap(async (mapId) => {
 *       const response = await fetch(`/maps/${mapId}.json`)
 *       const mapData = await response.json()
 *       
 *       return {
 *         data: mapData,
 *         component: MyTiledMapComponent,
 *         width: mapData.width,
 *         height: mapData.height,
 *         events: mapData.events
 *       }
 *     })
 *   ])
 * }
 * 
 * // Advanced usage with Tiled TMX files
 * export function provideTiledMap() {
 *   return createModule("TiledMap", [
 *     provideLoadMap(async (mapId) => {
 *       // Load TMX file
 *       const tmxResponse = await fetch(`/tiled/${mapId}.tmx`)
 *       const tmxData = await tmxResponse.text()
 *       
 *       // Parse TMX data (using a TMX parser)
 *       const parsedMap = parseTMX(tmxData)
 *       
 *       return {
 *         data: parsedMap,
 *         component: TiledMapRenderer,
 *         width: parsedMap.width * parsedMap.tilewidth,
 *         height: parsedMap.height * parsedMap.tileheight,
 *         events: parsedMap.objectGroups?.find(g => g.name === 'events')?.objects
 *       }
 *     })
 *   ])
 * }
 * 
 * // Synchronous usage for static maps
 * export function provideStaticMap() {
 *   return createModule("StaticMap", [
 *     provideLoadMap((mapId) => {
 *       const staticMaps = {
 *         'town': { tiles: [...], npcs: [...] },
 *         'dungeon': { tiles: [...], monsters: [...] }
 *       }
 *       
 *       return {
 *         data: staticMaps[mapId],
 *         component: StaticMapComponent,
 *         width: 800,
 *         height: 600
 *       }
 *     })
 *   ])
 * }
 * ```
 * 
 * @since 4.0.0
 * @see {@link LoadMapOptions} for callback function signature
 * @see {@link MapData} for return data structure
 */
export function provideLoadMap(options: LoadMapOptions): RpgProvider[] {
  return [
    {
      provide: UpdateMapToken,
      useFactory: (context: RpgContext) => {
        if (context.side === 'client') {
          console.warn('UpdateMapToken is not overridden')
        }
        return
      },
    },
    {
      provide: LoadMapToken,
      useFactory: (context: RpgContext) => new LoadMapService(context, options),
    },
  ];
}
