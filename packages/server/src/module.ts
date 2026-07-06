import { TIME_MANAGER_MODULE_KEY, findModules, provideModules, registerI18nMessages } from "@rpgjs/common";
import { FactoryProvider, inject as diInject, isProvided, provide as diProvide } from "@signe/di";
import { RpgServerEngine } from "./RpgServerEngine";
import { RpgMap } from "./rooms/map";
import { RpgPlayer } from "./Player/Player";
import { RpgServer } from "./RpgServer";
import { TimeManager } from "./services/time";

/**
 * Type for server modules that can be either:
 * - An object implementing RpgServer interface
 * - A class decorated with @RpgModule decorator
 */
export type RpgServerModule = RpgServer | (new () => any);

/**
 * Provides server modules configuration to Angular Dependency Injection
 * 
 * This function accepts an array of server modules that can be either:
 * - Objects implementing the RpgServer interface
 * - Classes decorated with the @RpgModule decorator (which will be instantiated)
 * 
 * @param modules - Array of server modules (objects or classes)
 * @returns FactoryProvider configuration for Angular DI
 * @example
 * ```ts
 * // Using an object
 * provideServerModules([
 *   {
 *     player: {
 *       onConnected(player) {
 *         console.log('Player connected')
 *       }
 *     }
 *   }
 * ])
 * 
 * // Using a decorated class
 * @RpgModule<RpgServer>({
 *   engine: {
 *     onStart(server) {
 *       console.log('Server started')
 *     }
 *   }
 * })
 * class MyServerModule {}
 * 
 * provideServerModules([MyServerModule])
 * ```
 */
export function provideServerModules(modules: RpgServerModule[]): FactoryProvider {
  return provideModules(modules, "server", (modules, context) => {
    const mainModuleServer = findModules(context, 'Server')
    modules = [...mainModuleServer, ...modules]
    modules = modules.map((module) => {
      // If module is a class (constructor function), instantiate it
      // The RpgModule decorator adds properties to the prototype, which will be accessible via the instance
      if (typeof module === 'function') {
        const instance = new module() as any;
        // Copy all enumerable properties (including from prototype) to a plain object
        const moduleObj: any = {};
        for (const key in instance) {
          moduleObj[key] = instance[key];
        }
        module = moduleObj;
      }
      if ('server' in module) {
        module = module.server as any;
      }
      if (module[TIME_MANAGER_MODULE_KEY]) {
        const options = module[TIME_MANAGER_MODULE_KEY];
        const timeManager = isProvided(context, TimeManager)
          ? diInject<TimeManager>(context, TimeManager)
          : diProvide(context, TimeManager, new TimeManager());
        timeManager.configure(options);
        const mapHooks = module.map ?? {};
        module = {
          ...module,
          [TIME_MANAGER_MODULE_KEY]: undefined,
          map: {
            ...mapHooks,
            onStart: (map: RpgMap) => {
              timeManager.registerMap(map);
              return mapHooks.onStart?.(map);
            },
            onLoad: (map: RpgMap) => {
              timeManager.registerMap(map);
              return mapHooks.onLoad?.(map);
            },
            onJoin: (player: RpgPlayer, map: RpgMap) => {
              timeManager.registerMap(map);
              return mapHooks.onJoin?.(player, map);
            },
            onLeave: (player: RpgPlayer, map: RpgMap) => {
              const result = mapHooks.onLeave?.(player, map);
              if (map.getPlayers().length <= 1) {
                timeManager.unregisterMap(map);
              }
              return result;
            },
          },
        };
        delete module[TIME_MANAGER_MODULE_KEY];
      }
      if (module.i18n) {
        registerI18nMessages(context, module.i18n, "server-module", 10);
      }
      if (module.player?.props) {
        module = {
          ...module,
          playerProps: {
            load: (player: RpgPlayer) => {
              player.setSync(module.player.props)
            },
          }
        };
      }
      if (module.maps && Array.isArray(module.maps)) {
        const maps = [...module.maps];
        module = {
          ...module,
          maps: {
            load: (engine: RpgMap) => {
              maps.forEach((map) => {
                // If map is a class (constructor function), extract properties from class and prototype
                // Otherwise, use the object directly
                let mapInstance: any;
                if (typeof map === 'function') {
                  // Extract properties from the class (static properties set by @MapData decorator)
                  // and from the prototype (instance properties like _events)
                  // The decorator sets properties on both the class and prototype, so we check both
                  const MapClass = map as any;
                  mapInstance = {
                    id: MapClass.prototype?.id ?? MapClass.id,
                    file: MapClass.prototype?.file ?? MapClass.file,
                    type: MapClass.type,
                    name: MapClass.prototype?.name,
                    sounds: MapClass.prototype?.sounds,
                    weather: MapClass.prototype?.weather,
                    lowMemory: MapClass.prototype?.lowMemory,
                    stopAllSoundsBeforeJoin: MapClass.prototype?.stopAllSoundsBeforeJoin,
                    events: MapClass.prototype?._events,
                    syncSchema: MapClass.prototype?.$schema,
                    onLoad: MapClass.prototype?.onLoad,
                    onJoin: MapClass.prototype?.onJoin,
                    onLeave: MapClass.prototype?.onLeave,
                  };
                } else {
                  mapInstance = map;
                }
                engine.maps.push(mapInstance);
              });
            },
          }
        };
      }
      if (module.worldMaps && Array.isArray(module.worldMaps)) {
        const worldMaps = [...module.worldMaps];
        module = {
          ...module,
          worldMaps: {
            load: (engine: RpgMap) => {
              worldMaps.forEach((worldMap) => {
                engine.createDynamicWorldMaps(worldMap)
              });
            },
          }
        };
      }
      if (module.database) {
        const database = module.database;
        module = {
          ...module,
          databaseHooks: {
            load: async (engine: RpgMap) => {
              const data = typeof database === 'function'
                ? await database(engine)
                : database;
              if (!data || typeof data !== 'object') {
                return;
              }
              for (const key in data) {
                engine.addInDatabase(key, data[key]);
              }
            },
          }
        };
      }
      return module;
    })
    return modules
  });
}
 
