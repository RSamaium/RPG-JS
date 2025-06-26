import { findModules, provideModules } from "@rpgjs/common";
import { FactoryProvider } from "@signe/di";
import { RpgServerEngine } from "./RpgServerEngine";
import { RpgMap } from "./rooms/map";

export function provideServerModules(modules: any[]): FactoryProvider {
  return provideModules(modules, "server", (modules, context) => {
    const mainModuleServer = findModules(context, 'Server')
    modules = [...mainModuleServer, ...modules]
    modules = modules.map((module) => {
      if ('server' in module) {
        module = module.server as any;
      }
      if (module.maps && Array.isArray(module.maps)) {
        const maps = [...module.maps];
        module = {
          ...module,
          maps: {
            load: (engine: RpgMap) => {
              maps.forEach((map) => {
                engine.maps.push(map);
              });
            },
          }
        };
      }
      if (module.database ) {
        const database = {...module.database};
        module = {
          ...module,
          databaseList: {
            load: (engine: RpgMap) => {
              for (let id in database) {
                engine.addInDatabase(id, database[id]);
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
 