import { TIME_MANAGER_MODULE_KEY, TIME_MANAGER_SYNC_KEY, findModules, provideModules, registerI18nMessages } from "@rpgjs/common";
import { FactoryProvider, inject as diInject, isProvided, provide as diProvide } from "@signe/di";
import { RpgClientEngine } from "./RpgClientEngine";
import { RpgClient } from "./RpgClient";
import { inject } from "@signe/di";
import { RpgGui } from "./Gui/Gui";
import { getSoundMetadata } from "./Sound";
import { ClientTimeManager } from "./services/time";

/**
 * Type for client modules that can be either:
 * - An object implementing RpgClient interface
 * - A class decorated with @RpgModule decorator
 */
export type RpgClientModule = RpgClient | (new () => any);

/**
 * Provides client modules configuration to Dependency Injection
 * 
 * This function accepts an array of client modules that can be either:
 * - Objects implementing the RpgClient interface
 * - Classes decorated with the @RpgModule decorator (which will be instantiated)
 * 
 * @param modules - Array of client modules (objects or classes)
 * @returns FactoryProvider configuration for DI
 * @example
 * ```ts
 * // Using an object
 * provideClientModules([
 *   {
 *     engine: {
 *       onConnected(engine) {
 *         console.log('Client connected')
 *       }
 *     }
 *   }
 * ])
 * 
 * // Using a decorated class
 * @RpgModule<RpgClient>({
 *   engine: {
 *     onStart(engine) {
 *       console.log('Client started')
 *     }
 *   }
 * })
 * class MyClientModule {}
 * 
 * provideClientModules([MyClientModule])
 * ```
 */
export function provideClientModules(modules: RpgClientModule[]): FactoryProvider {
  return provideModules(modules, "client", (modules, context) => {
    const mainModuleClient = findModules(context, 'Client')
    modules = [...mainModuleClient, ...modules]
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
      if ('client' in module) {
        module = module.client as any;
      }
      if (module[TIME_MANAGER_MODULE_KEY]) {
        const options = module[TIME_MANAGER_MODULE_KEY];
        const timeManager = isProvided(context, ClientTimeManager)
          ? diInject<ClientTimeManager>(context, ClientTimeManager)
          : diProvide(context, ClientTimeManager, new ClientTimeManager());
        timeManager.configure(options);
        const engineHooks = module.engine ?? {};
        const sceneMapHooks = module.sceneMap ?? {};
        module = {
          ...module,
          [TIME_MANAGER_MODULE_KEY]: undefined,
          engine: {
            ...engineHooks,
            onStart: (engine: RpgClientEngine) => {
              engine.socket.on("timeState", (data: any) => {
                const raw = data && typeof data === "object" && "value" in data
                  ? data.value
                  : data;
                timeManager.acceptSnapshot(raw ?? null);
              });
              return engineHooks.onStart?.(engine);
            },
          },
          sceneMap: {
            ...sceneMapHooks,
            onChanges: (sceneMap: any, payload: { partial?: any }) => {
              const partial = payload?.partial;
              if (partial && Object.prototype.hasOwnProperty.call(partial, TIME_MANAGER_SYNC_KEY)) {
                timeManager.acceptSnapshot(partial[TIME_MANAGER_SYNC_KEY]);
              } else if (partial) {
                const patch = extractTimeSnapshotPatch(partial);
                if (patch) {
                  timeManager.patchSnapshot(patch);
                }
              }
              return sceneMapHooks.onChanges?.(sceneMap, payload);
            },
          },
        };
        delete module[TIME_MANAGER_MODULE_KEY];
      }
      if (module.i18n) {
        registerI18nMessages(context, module.i18n, "client-module", 10);
      }
      if (module.spritesheets) {
        const spritesheets = [...module.spritesheets];
        module.spritesheets = {
          load: (engine: RpgClientEngine) => {
            spritesheets.forEach((spritesheet) => {
              engine.addSpriteSheet(spritesheet);
            });
          },
        };
      }
      if (module.spritesheetResolver) {
        const resolver = module.spritesheetResolver;
        module.spritesheetResolver = {
          load: (engine: RpgClientEngine) => {
            engine.setSpritesheetResolver(resolver);
          },
        };
      }
      if (module.sounds) {
        const sounds = [...module.sounds];
        module.sounds = {
          load: (engine: RpgClientEngine) => {
            sounds.forEach((sound) => {
              // Check if it's a class decorated with @Sound
              if (typeof sound === 'function' || (sound && sound.constructor && sound.constructor !== Object)) {
                const metadata = getSoundMetadata(sound);
                if (metadata) {
                  // Handle single sound
                  if (metadata.id && metadata.sound) {
                    engine.addSound({
                      id: metadata.id,
                      src: metadata.sound,
                      loop: metadata.loop,
                      volume: metadata.volume,
                    });
                  }
                  // Handle multiple sounds
                  if (metadata.sounds) {
                    Object.entries(metadata.sounds).forEach(([soundId, soundSrc]) => {
                      engine.addSound({
                        id: soundId,
                        src: soundSrc,
                        loop: metadata.loop,
                        volume: metadata.volume,
                      });
                    });
                  }
                } else {
                  // Not a decorated class, treat as regular sound object
                  engine.addSound(sound);
                }
              } else {
                // Regular sound object
                engine.addSound(sound);
              }
            });
          },
        };
      }
      if (module.soundResolver) {
        const resolver = module.soundResolver;
        module.soundResolver = {
          load: (engine: RpgClientEngine) => {
            engine.setSoundResolver(resolver);
          },
        };
      }
      if (module.gui) {
        const gui = [...module.gui];
        module.gui = {
          load: (engine: RpgClientEngine) => {
            const guiService = inject(engine.context, RpgGui) as RpgGui;
            gui.forEach((gui) => {
              guiService.add(gui);
            });
          },
        };
      }
      if (module.componentAnimations) {
        const componentAnimations = [...module.componentAnimations];
        module.componentAnimations = {
          load: (engine: RpgClientEngine) => {
            componentAnimations.forEach((componentAnimation) => {
              engine.addComponentAnimation(componentAnimation);
            });
          },
        };
      }
      if (module.clientVisuals) {
        const clientVisuals = { ...module.clientVisuals };
        module.clientVisuals = {
          load: (engine: RpgClientEngine) => {
            engine.registerClientVisuals(clientVisuals);
          },
        };
      }
      if (module.projectiles) {
        const projectiles = { ...module.projectiles };
        module.projectiles = {
          ...projectiles,
          load: (engine: RpgClientEngine) => {
            if (projectiles.components) {
              Object.entries(projectiles.components).forEach(([type, component]) => {
                engine.registerProjectileComponent(type, component);
              });
            }
          },
        };
      }
      if (module.interactions) {
        const interactions = module.interactions;
        module.interactions = {
          ...interactions,
          load: (engine: RpgClientEngine) => {
            if (typeof interactions === "function") {
              interactions(engine);
              return;
            }
            interactions.load?.(engine);
            interactions.setup?.(engine);
            if (Array.isArray(interactions.use)) {
              interactions.use.forEach(([matcher, behavior]) => {
                engine.interactions.use(matcher, behavior);
              });
            }
          },
        };
      }
      if (module.transitions) {
        const transitions = [...module.transitions];
        module.transitions = {
          load: (engine: RpgClientEngine) => {
            const guiService = inject(engine.context, RpgGui) as RpgGui;
            transitions.forEach((transition) => {
              guiService.add({
                name: transition.id,
                component: transition.component,
                data: transition.props || {}
              });
            });
          },
        };
      }
      if (module.particles) {
        const particles = [...module.particles];
        module.particles = {
          load: (engine: RpgClientEngine) => {
            particles.forEach((particle) => {
              engine.addParticle(particle);
            });
          },
        };
      }
      if (module.sprite) {
        const sprite = {...module.sprite};
        module.sprite = {
          ...sprite,
          load: (engine: RpgClientEngine) => {
            if (sprite.componentsBehind) {
              sprite.componentsBehind.forEach((component) => {
                engine.addSpriteComponentBehind(component);
              });
            }
            if (sprite.componentsInFront) {
              sprite.componentsInFront.forEach((component) => {
                engine.addSpriteComponentInFront(component);
              });
            }
            if (sprite.components) {
              Object.entries(sprite.components).forEach(([id, component]) => {
                engine.registerSpriteComponent(id, component);
              });
            }
            if (sprite.eventComponent) {
              engine.addEventComponentResolver(sprite.eventComponent);
            }
          },
        };
      }
      return module;
    });
    return modules
  });
}

function extractTimeSnapshotPatch(partial: Record<string, any>) {
  const prefix = `${TIME_MANAGER_SYNC_KEY}.`;
  let found = false;
  const patch: Record<string, any> = {};

  for (const [key, value] of Object.entries(partial)) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    found = true;
    assignPath(patch, key.slice(prefix.length).split("."), value);
  }

  return found ? patch : null;
}

function assignPath(target: Record<string, any>, parts: string[], value: any): void {
  let current = target;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }
    current[part] = current[part] ?? {};
    current = current[part];
  }
}

export const GlobalConfigToken = "GlobalConfigToken";

export function provideGlobalConfig(config: any) {
  return {
    provide: GlobalConfigToken,
    useValue: config ?? {},
  };
}

export function provideClientGlobalConfig(config: any = {}) {
  config.keyboardControls = {
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
    action: 'space',
    dash: 'shift',
    escape: 'escape',
    ...(config.keyboardControls ?? {}),
  }
  return provideGlobalConfig(config)
}
