import { RpgPlugin, HookServer, HookClient } from './Plugin'

enum Side {
    Server = 'server',
    Client = 'client'
}

export function RpgModule<T>(options: T) {
    return (target) => {
        for (let key in options) {
            target.prototype[key] = options[key]
        }
    }
}

export function loadModules(modules, obj) {
    const { side, relations } = obj
    for (let module of modules) {
        if (!module[side]) continue
        const mod = new module[side]()
        const { imports, maps, spritesheets, sounds, gui, scenes } = mod
        if (imports) {
            loadModules(imports, obj)
        }
        if (maps) {
            RpgPlugin.on(HookServer.AddMap, () => maps)
        }
        if (spritesheets) {
            RpgPlugin.on(HookClient.AddSpriteSheet, () => spritesheets)
        }
        if (sounds) {
            RpgPlugin.on(HookClient.AddSound, () => sounds)
        }
        if (gui) {
            RpgPlugin.on(HookClient.AddGui, () => gui)
        }
        const player = side == Side.Server ? mod.player : mod.sprite
        const loadRelations = (hook, relatioName) => {
            if (hook) {
                for (let method in relations[relatioName]) {
                    const hookName = relations[relatioName][method]
                    if (hook[method]) RpgPlugin.on(hookName, hook[method])
                }
            }
        }
        loadRelations(player, 'player')
        if (scenes) loadRelations(scenes.map, 'sceneMap')
    }
}