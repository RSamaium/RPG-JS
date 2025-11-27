import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';
import sizeOf from 'image-size';
import {
    ClientBuildConfigOptions,
    Config,
<<<<<<< HEAD
=======
    loadGlobalConfig,
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
    warn,
    assetsFolder,
    extractProjectPath,
    relativePath,
    toPosix,
    dd,
    formatVariableName,
    transformPathIfModule,
    getAllFiles,
    searchFolderAndTransformToImportString,
    importString,
<<<<<<< HEAD
    ImportObject
=======
    ImportObject,
    loadRpgToml
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
} from './utils';
import { flagTransform } from './flag-transform';
import vitePluginRequire from './require-transform';
import { tiledMapFolderPlugin } from '../tiled-map-folder-plugin';
<<<<<<< HEAD
import { loadConfigFileSync } from './load-confg-file';
=======
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap

const MODULE_NAME = 'virtual-modules'
const GLOBAL_CONFIG_CLIENT = 'virtual-config-client'
const GLOBAL_CONFIG_SERVER = 'virtual-config-server'

const { cwd, exit } = process

type ImportImageObject = ImportObject & { propImagesString: string }

function resolveModule(moduleName: string) {
    return transformPathIfModule(moduleName)
}

<<<<<<< HEAD
export function loadServerFiles(modulePath: string, options: any, config: Config, globalConfig: any = {}, projectRoot?: string) {
    const modulesCreated = options.modulesCreated || []
    if (!modulesCreated.includes(modulePath)) modulesCreated.push(modulePath)
    const root = projectRoot || cwd()

    const importPlayer = importString(modulePath, 'player', undefined, root)
    const importEngine = importString(modulePath, 'server', undefined, root)
    const mapStandaloneFilesString = searchFolderAndTransformToImportString('maps', modulePath, '.ts', undefined, undefined, root)
    const mapFilesString = searchFolderAndTransformToImportString('maps', modulePath, '.tmx', (file, variableName) => {
        return `{ id: '${file.replace('.tmx', '')}', file: ${variableName} }`
    }, undefined, root)
    const worldFilesString = searchFolderAndTransformToImportString('worlds', modulePath, '.ts', undefined, undefined, root)
    const eventsFilesString = searchFolderAndTransformToImportString('events', modulePath, '.ts', undefined, undefined, root)
    const databaseFilesString = searchFolderAndTransformToImportString('database', modulePath, '.ts', undefined, undefined, root)
=======
export function loadServerFiles(modulePath: string, options: any, config: Config) {
    const modulesCreated = options.modulesCreated || []
    if (!modulesCreated.includes(modulePath)) modulesCreated.push(modulePath)

    const importPlayer = importString(modulePath, 'player')
    const importEngine = importString(modulePath, 'server')
    const mapStandaloneFilesString = searchFolderAndTransformToImportString('maps', modulePath, '.ts')
    const mapFilesString = searchFolderAndTransformToImportString('maps', modulePath, '.tmx', (file, variableName) => {
        return `{ id: '${file.replace('.tmx', '')}', file: ${variableName} }`
    })
    const worldFilesString = searchFolderAndTransformToImportString('worlds', modulePath, '.ts')
    const eventsFilesString = searchFolderAndTransformToImportString('events', modulePath, '.ts')
    const databaseFilesString = searchFolderAndTransformToImportString('database', modulePath, '.ts')
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap

    const hasMaps = mapFilesString?.variablesString || mapStandaloneFilesString?.variablesString

    // Check if tiled folder exists
<<<<<<< HEAD
    const tiledFolderPath = path.join(cwd(), 'tiled')
=======
    const tiledFolderPath = path.join(cwd(), 'src', 'tiled')
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
    const hasTiled = fs.existsSync(tiledFolderPath)
    const tiledImport = hasTiled ? "import { provideTiledMap } from '@rpgjs/tiledmap/server'" : ''
    const tiledProvider = hasTiled ? 'provideTiledMap(),' : ''

<<<<<<< HEAD
    // Generate player override code from global config if single module
    const startConfig = globalConfig.start || config.start || {}
    const startMap = globalConfig.startMap || config.startMap
    const hitbox = startConfig.hitbox
    const hasStartConfig = startConfig.graphic || hitbox || startMap

    // Generate player wrapper code if needed
    const shouldWrapPlayer = importPlayer && modulesCreated.length === 1 && hasStartConfig
    const graphicCode = shouldWrapPlayer && startConfig.graphic ? `player.setGraphic('${startConfig.graphic}')` : ''
    const hitboxCode = shouldWrapPlayer && hitbox ? `player.setHitbox(${hitbox[0]}, ${hitbox[1]})` : ''
    const mapCode = shouldWrapPlayer && startMap ? `await player.changeMap('${startMap}')` : ''
    
    const playerWrapper = shouldWrapPlayer ? dd`
        const _lastConnectedCb = player.onConnected

        player.onConnected = async (player) => {

            if (_lastConnectedCb) await _lastConnectedCb(player)

           

                ${graphicCode}

                //${hitboxCode}

                ${mapCode}

            

        }
    ` : ''

=======
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
    const code = dd`
        import { createServer, provideServerModules } from '@rpgjs/server'
        ${tiledImport}
        ${importPlayer}
        ${importEngine}
        ${mapFilesString?.importString || ''}
        ${mapStandaloneFilesString?.importString || ''}
        ${worldFilesString?.importString || ''}
        ${eventsFilesString?.importString || ''}
        ${databaseFilesString?.importString || ''}

<<<<<<< HEAD
        ${playerWrapper}

=======
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
        export default createServer({
            providers: [
                ${tiledProvider}
                provideServerModules([
                    {
                        ${importPlayer ? 'player,' : ''}
                        ${importEngine ? 'engine: server,' : ''}
                        events: [${eventsFilesString?.variablesString || ''}],
                        database: [${databaseFilesString?.variablesString || ''}],
                        maps: [${mapFilesString?.variablesString || ''}${hasMaps ? ',' : ''}${mapStandaloneFilesString?.variablesString || ''}],
                        worldMaps: [${worldFilesString?.variablesString || ''}]
                    }
                ])
            ]
        })
    `
    return code
}

export function loadSpriteSheet(directoryName: string, modulePath: string, options: any, warning = false): ImportImageObject {
    const importSprites = searchFolderAndTransformToImportString(directoryName, modulePath, '.ts')
    let propImagesString = ''

    if (importSprites?.importString) {
        const folder = importSprites.folder
        let objectString = ''
        const projectPath = folder.replace(cwd(), '/')

        getAllFiles(folder).filter(file => {
            const ext = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg']
            return ext.some(e => file.toLowerCase().endsWith(e))
        }).forEach(file => {
            const filename = path.basename(file)
            const basename = filename.replace(path.extname(file), '')

            if (options.serveMode === false) {
                const { outputDir = 'dist' } = options.config?.compilerOptions?.build || {}
                const dest = path.join(outputDir, assetsFolder(options.type === 'rpg' ? '' : 'client'), filename)
                if (!fs.existsSync(path.dirname(dest))) {
                    fs.mkdirSync(path.dirname(dest), { recursive: true });
                }
                fs.copyFileSync(file, dest)
            }
            objectString += `"${basename}": "${toPosix(extractProjectPath(file, projectPath.replace(/^\/+/, '')))}", `
        })
    }

    return {
        ...importSprites,
        propImagesString
    }
}

<<<<<<< HEAD
export function loadClientFiles(modulePath: string, options: any, config: Config, globalConfig: any = {}, projectRoot?: string) {
    const modulesCreated = options.modulesCreated || []
    if (!modulesCreated.includes(modulePath)) modulesCreated.push(modulePath)
    const root = projectRoot || cwd()

    const importSpriteString = importString(modulePath, 'sprite', undefined, root)
    const importSceneMapString = importString(modulePath, 'scene-map', undefined, root)
    const importEngine = importString(modulePath, 'client', undefined, root)
    const guiFilesString = searchFolderAndTransformToImportString('gui', modulePath, '.vue', undefined, undefined, root)
    const soundFilesString = searchFolderAndTransformToImportString('sounds', modulePath, '.ogg', undefined, undefined, root)
    const soundStandaloneFilesString = searchFolderAndTransformToImportString('sounds', modulePath, '.ts', undefined, undefined, root)
    const importSpritesheets = loadSpriteSheet('spritesheets', modulePath, options, true)

    // Check if tiled folder exists
    const tiledFolderPath = path.join(cwd(), 'tiled')
=======
export function loadClientFiles(modulePath: string, options: any, config: Config) {
    const modulesCreated = options.modulesCreated || []
    if (!modulesCreated.includes(modulePath)) modulesCreated.push(modulePath)

    const importSpriteString = importString(modulePath, 'sprite')
    const importSceneMapString = importString(modulePath, 'scene-map')
    const importEngine = importString(modulePath, 'client')
    const guiFilesString = searchFolderAndTransformToImportString('gui', modulePath, '.vue')
    const soundFilesString = searchFolderAndTransformToImportString('sounds', modulePath, '.ogg')
    const soundStandaloneFilesString = searchFolderAndTransformToImportString('sounds', modulePath, '.ts')
    const importSpritesheets = loadSpriteSheet('spritesheets', modulePath, options, true)

    // Check if tiled folder exists
    const tiledFolderPath = path.join(cwd(), 'src', 'tiled')
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
    const hasTiled = fs.existsSync(tiledFolderPath)
    const tiledImport = hasTiled ? "import { provideTiledMap } from '@rpgjs/tiledmap/client'" : ''
    const tiledProvider = hasTiled ? 'provideTiledMap({ basePath: "map" }),' : ''

<<<<<<< HEAD
    // Generate provideClientGlobalConfig with loaded config
    const configJson = JSON.stringify(globalConfig || {})

    const code = dd`
        import { provideClientModules, provideClientGlobalConfig } from '@rpgjs/client'
=======
    const code = dd`
        import { provideClientModules } from '@rpgjs/client'
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
        ${tiledImport}
        ${importSpriteString || ''}
        ${importSceneMapString || ''}
        ${importEngine || ''}
        ${guiFilesString?.importString || ''}
        ${soundFilesString?.importString || ''}
        ${soundStandaloneFilesString?.importString || ''}
        ${importSpritesheets?.importString || ''}

        export default {
            providers: [
<<<<<<< HEAD
                provideClientGlobalConfig(${configJson}),
=======
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
                ${tiledProvider}
                provideClientModules([
                    {
                        ${importSpriteString ? 'sprite,' : ''}
                        ${importEngine ? 'engine: client,' : ''}
                        ${importSceneMapString ? 'sceneMap: sceneMap,' : ''}
                        gui: [${guiFilesString?.variablesString || ''}],
                        sounds: [${soundFilesString?.variablesString || ''}${soundFilesString?.variablesString && soundStandaloneFilesString?.variablesString ? ',' : ''}${soundStandaloneFilesString?.variablesString || ''}],
                        spritesheets: [${importSpritesheets?.variablesString || ''}]
                    }
                ])
            ]
        }
    `
    return code
}

<<<<<<< HEAD
export function createModuleLoad(id: string, variableName: string, modulePath: string, options: any, config: Config, globalConfig: any = {}, projectRoot?: string) {
    const clientFile = `virtual-${variableName}-client.ts`
    const serverFile = `virtual-${variableName}-server.ts`
    const root = projectRoot || cwd()

    if (id.includes(serverFile) && id.includes('?server')) {
        return loadServerFiles(modulePath, options, config, globalConfig, root)
    }
    else if (id.includes(clientFile) && id.includes('?client')) {
        return loadClientFiles(modulePath, options, config, globalConfig, root)
=======
export function createModuleLoad(id: string, variableName: string, modulePath: string, options: any, config: Config) {
    const clientFile = `virtual-${variableName}-client.ts`
    const serverFile = `virtual-${variableName}-server.ts`

    if (id.includes(serverFile) && id.includes('?server')) {
        return loadServerFiles(modulePath, options, config)
    }
    else if (id.includes(clientFile) && id.includes('?client')) {
        return loadClientFiles(modulePath, options, config)
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
    }

    const modulePathId = path.join(cwd(), id)
    const packageJson = path.join(modulePathId, 'package.json')
    const indexFile = path.join(modulePathId, 'index.ts')

    if (fs.existsSync(packageJson)) {
        const { main: entryPoint } = JSON.parse(fs.readFileSync(packageJson).toString())
        if (entryPoint) {
            const mod = toPosix(path.join(id, entryPoint))
            return dd`
                import mod from '@/${mod}'
                export default mod
            `
        }
    }
    else if (fs.existsSync(indexFile)) {
        const mod = extractProjectPath(toPosix(indexFile), id)
        return dd`
            import mod from '@/${mod}'
            export default mod
        `
    }

    return dd`
        import client from 'client!./${clientFile}'
        import server from 'server!./${serverFile}'
        
        export default {
            client,
            server
        } 
    `
}

<<<<<<< HEAD
export function createConfigFiles(id: string, configServer: any, globalConfig: any): string | null {
=======
export function createConfigFiles(id: string, configServer: any, configClient: any): string | null {
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
    if (id.endsWith(GLOBAL_CONFIG_SERVER)) {
        return `export default ${JSON.stringify(configServer)}`
    }
    else if (id.endsWith(GLOBAL_CONFIG_CLIENT)) {
<<<<<<< HEAD
        // Generate a config file that uses provideClientGlobalConfig with the loaded config
        const configJson = JSON.stringify(globalConfig || {})
        return dd`
            import { provideClientGlobalConfig } from '@rpgjs/client'
            
            export default {
                providers: [
                    provideClientGlobalConfig(${configJson})
                ]
            }
        `
=======
        return `export default ${JSON.stringify(configClient)}`
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
    }
    return null
}

<<<<<<< HEAD
export default function compatibilityV4Plugin(options: Partial<ClientBuildConfigOptions> = {}): Plugin[] {
    let modules: string[] = []
    let modulesCreated: string[] = []
    let resolvedOptions: ClientBuildConfigOptions = {
        type: (process.env.RPG_TYPE as 'rpg' | 'mmorpg') || 'mmorpg',
        serveMode: true,
        side: 'client',
        ...options
    }
    let viteMode: string = 'development'
    let globalConfig: any = {}
    let config: Config = {}

    // Load global config from rpg.toml/rpg.json using loadConfigFileSync
    try {
        globalConfig = loadConfigFileSync(viteMode)
        // Get modules from rpg.toml
        if (globalConfig.modules) {
            modules = Array.isArray(globalConfig.modules) ? globalConfig.modules : [globalConfig.modules]
        }
        // Get type from rpg.toml or env var if not provided in options (priority: options > rpg.toml > env var)
        if (!options.type) {
            if (globalConfig.type) {
                resolvedOptions.type = globalConfig.type
            } else if (process.env.RPG_TYPE) {
                resolvedOptions.type = process.env.RPG_TYPE as 'rpg' | 'mmorpg'
            }
        }
        config = { ...globalConfig }
    } catch (err) {
        warn(`Error loading config file: ${err}`)
    }

    const plugins: Plugin[] = []

    // Add tiled map plugin by default if tiled folder exists
    const tiledFolderPath = path.join(cwd(), 'tiled')
    if (fs.existsSync(tiledFolderPath)) {
        plugins.push(
            tiledMapFolderPlugin({
                sourceFolder: './tiled',
=======
export default function compatibilityV4Plugin(options: ClientBuildConfigOptions = {}, config: Config): Plugin[] | undefined {
    let modules: string[] = []
    let modulesCreated: string[] = []

    if (config.modules) {
        modules = config.modules;
    }

    const rpgToml = loadRpgToml(cwd());
    if (rpgToml.modules) {
        modules = [...modules, ...rpgToml.modules];
    }

    config = { ...rpgToml, ...config };

    let ret: any
    try {
        ret = loadGlobalConfig(modules, config, options)
    }
    catch (err) {
        if (options.side == 'server') exit()
    }

    if (!ret) return

    const { configClient, configServer } = ret

    const plugins: Plugin[] = []

    // Add tiled map plugin by default if src/tiled folder exists
    const tiledFolderPath = path.join(cwd(), 'src', 'tiled')
    if (fs.existsSync(tiledFolderPath)) {
        plugins.push(
            tiledMapFolderPlugin({
                sourceFolder: './src/tiled',
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
                publicPath: '/map',
                buildOutputPath: 'assets/data'
            })
        )
    }

    plugins.push(
<<<<<<< HEAD
        {
            name: 'vite-plugin-config-toml',
            enforce: 'pre',
            configResolved(viteConfig) {
                // Determine mode and serveMode from Vite config
                viteMode = viteConfig.mode || 'development'
                resolvedOptions.serveMode = viteConfig.command === 'serve'
                
                // Reload config with correct mode
                try {
                    globalConfig = loadConfigFileSync(viteMode)
                    if (globalConfig.modules) {
                        modules = Array.isArray(globalConfig.modules) ? globalConfig.modules : [globalConfig.modules]
                    }
                    // Get type from rpg.toml or env var if not provided in options (priority: options > rpg.toml > env var)
                    if (!options.type) {
                        if (globalConfig.type) {
                            resolvedOptions.type = globalConfig.type
                        } else if (process.env.RPG_TYPE) {
                            resolvedOptions.type = process.env.RPG_TYPE as 'rpg' | 'mmorpg'
                        }
                    }
                    config = { ...globalConfig }
                } catch (err) {
                    warn(`Error loading config file: ${err}`)
                }
            },
            handleHotUpdate() {
                modulesCreated = []
            },
        },
        flagTransform({
            side: resolvedOptions.side,
            mode: viteMode,
            type: resolvedOptions.type
        }),
        vitePluginRequire(),
        {
            name: 'vite-plugin-compatibility-v4',
            enforce: 'pre',
=======
        flagTransform({
            side: options.side,
            mode: config.vite?.mode,
            type: options.type
        }),
        vitePluginRequire(),
        {
            name: 'vite-plugin-config-toml',
            enforce: 'pre',
            handleHotUpdate() {
                modulesCreated = []
            },
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
            async resolveId(source: string, importer?: string) {
                if (source.endsWith(MODULE_NAME) ||
                    source.endsWith(GLOBAL_CONFIG_CLIENT) ||
                    source.endsWith(GLOBAL_CONFIG_SERVER)
                ) {
                    return source;
                }

                // Check for virtual entry point files (client.ts, standalone.ts, server.ts)
                // Handle multiple path formats: relative, absolute, normalized, etc.
                const entryPointPatterns = [
                    { type: 'client' as const, patterns: ['src/client.ts', '/src/client.ts', 'client.ts'] },
                    { type: 'standalone' as const, patterns: ['src/standalone.ts', '/src/standalone.ts', 'standalone.ts'] },
                    { type: 'server' as const, patterns: ['src/server.ts', '/src/server.ts', 'server.ts'] }
                ]

                for (const { type, patterns } of entryPointPatterns) {
                    const isEntryPoint = patterns.some(pattern => {
                        // Check if source matches any pattern (exact match or contains)
                        const normalizedSource = source.replace(/^\.\//, '').replace(/^\/+/, '')
                        return source.includes(pattern) || 
                               normalizedSource === pattern || 
                               normalizedSource === pattern.replace(/^\//, '') ||
                               (path.isAbsolute(source) && path.normalize(source).endsWith(path.normalize(pattern)))
                    })

                    if (isEntryPoint) {
                        // Check if file exists
                        let filePath: string
                        if (path.isAbsolute(source)) {
                            filePath = source
                            // Verify it's actually pointing to the expected entry point
                            const normalized = path.normalize(filePath)
                            const expectedPath = path.normalize(path.join(cwd(), 'src', `${type}.ts`))
                            if (normalized !== expectedPath && !normalized.endsWith(path.join('src', `${type}.ts`))) {
                                continue // Try next pattern
                            }
                        } else {
                            filePath = path.join(cwd(), 'src', `${type}.ts`)
                        }
                        
                        if (!fs.existsSync(filePath)) {
                            return `virtual:src/${type}.ts`
                        }
                        // File exists, let Vite handle it normally
                        break
                    }
                }

                // Check for virtual config and server imports from entry points
                const normalizedSourceForConfig = source.replace(/^\.\//, '')
                if (normalizedSourceForConfig === 'config/config.client' || normalizedSourceForConfig === 'config/config.client.ts' || normalizedSourceForConfig.startsWith('./config/config.client')) {
                    const configPath = path.join(cwd(), 'src', 'config', 'config.client.ts')
                    if (!fs.existsSync(configPath)) {
                        return GLOBAL_CONFIG_CLIENT
                    }
                }
                if (normalizedSourceForConfig === 'server' || normalizedSourceForConfig === 'server.ts' || normalizedSourceForConfig.startsWith('./server')) {
                    // Only resolve if importer is from an entry point (standalone.ts or client.ts)
                    if (importer && (importer.includes('standalone') || importer.includes('client'))) {
                        const serverPath = path.join(cwd(), 'src', 'server.ts')
                        if (!fs.existsSync(serverPath)) {
                            return 'virtual-server.ts'
                        }
                    }
                }

<<<<<<< HEAD
                // Handle relative imports from virtual files (e.g., ./main/player.ts from virtual:src/server.ts)
                // Resolve them relative to project root
                if (importer && importer.includes('virtual:src/')) {
                    // Handle paths starting with ./ (relative to project root)
                    if (source.startsWith('./')) {
                        const pathFromRoot = source.replace(/^\.\//, '')
                        const resolvedPath = path.resolve(cwd(), pathFromRoot)
                        if (fs.existsSync(resolvedPath)) {
                            return resolvedPath
                        }
                    }
                    // Handle paths starting with ../ (back from src/ to root)
                    if (source.startsWith('../')) {
                        const pathFromRoot = source.replace(/^\.\.\//, '')
                        const resolvedPath = path.resolve(cwd(), pathFromRoot)
                        if (fs.existsSync(resolvedPath)) {
                            return resolvedPath
                        }
                    }
                }

=======
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
                for (let module of modules) {
                    if (source === resolveModule(module)) {
                        return source
                    }
                }

                // Handle virtual-server.ts imports
                if (source === './virtual-server.ts' || source === 'virtual-server.ts') {
                    return 'virtual-server.ts'
                }

                if (source.includes('virtual')) {
                    const baseSource = source.split('?')[0];
                    if (baseSource.includes('virtual-config-client') ||
                        baseSource.includes('virtual-config-server') ||
                        baseSource.includes('virtual-server')) {
                        return source;
                    }
<<<<<<< HEAD
                    if ((!source.endsWith('virtual-server.ts') && resolvedOptions.serveMode) || !resolvedOptions.serveMode) {
=======
                    if ((!source.endsWith('virtual-server.ts') && options.serveMode) || !options.serveMode) {
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
                        return source;
                    }
                }
                return null;
            },
            async load(id: string) {
                // Handle virtual entry point files
                if (id === 'virtual:src/client.ts') {
                    // Check if config file exists
                    const configPath = path.join(cwd(), 'src', 'config', 'config.client.ts')
                    const configImport = fs.existsSync(configPath)
                        ? "import configClient from './config/config.client'"
                        : `import configClient from '${GLOBAL_CONFIG_CLIENT}'`

                    return dd`
                        import { startGame, provideMmorpg } from '@rpgjs/client'
                        ${configImport}
                        import { mergeConfig } from '@signe/di'

                        startGame(
                            mergeConfig(configClient || { providers: [] }, {
                                providers: [provideMmorpg()],
                            })
                        )
                    `
                }

                if (id === 'virtual:src/standalone.ts') {
                    // Check if config file exists
                    const configPath = path.join(cwd(), 'src', 'config', 'config.client.ts')
                    const configImport = fs.existsSync(configPath)
                        ? "import configClient from './config/config.client'"
                        : `import configClient from '${GLOBAL_CONFIG_CLIENT}'`

                    // Check if server file exists
                    const serverPath = path.join(cwd(), 'src', 'server.ts')
                    const serverImport = fs.existsSync(serverPath)
                        ? "import startServer from './server'"
                        : `import startServer from './virtual-server.ts'`

                    return dd`
                        import { mergeConfig } from '@signe/di'
                        import { provideRpg, startGame } from '@rpgjs/client'
                        ${serverImport}
                        ${configImport}

                        startGame(
                            mergeConfig(configClient || { providers: [] }, {
                                providers: [provideRpg(startServer)],
                            })
                        )
                    `
                }

                if (id === 'virtual:src/server.ts') {
<<<<<<< HEAD
                    return loadServerFiles(modules[0] || '.', resolvedOptions, config, globalConfig, cwd())
=======
                    return loadServerFiles(modules[0] || '.', options, config)
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
                }

                // Handle virtual-config-client with any query string
                if (id.includes('virtual-config-client')) {
<<<<<<< HEAD
                    return loadClientFiles(modules[0] || '.', resolvedOptions, config, globalConfig, cwd())
=======
                    return loadClientFiles(modules[0] || '.', options, config)
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
                }

                // Handle virtual-config-server with any query string
                if (id.includes('virtual-config-server')) {
<<<<<<< HEAD
                    return `export default ${JSON.stringify({})}`
=======
                    return `export default ${JSON.stringify(configServer)}`
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
                }

                // Handle virtual-server with any query string
                if (id.includes('virtual-server')) {
<<<<<<< HEAD
                    return loadServerFiles(modules[0] || '.', resolvedOptions, config, globalConfig, cwd())
=======
                    return loadServerFiles(modules[0] || '.', options, config)
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
                }

                if (id.endsWith(MODULE_NAME)) {
                    const modulesToImport = modules.reduce((acc: Record<string, string>, module: string) => {
                        const variableName = formatVariableName(module);
                        acc[variableName] = module
                        return acc;
                    }, {});

                    return dd`
                        ${Object.keys(modulesToImport).map((variableName) => {
                        return `import ${variableName} from '${resolveModule(modulesToImport[variableName])}'`
                    }).join('\n')}

                        export default [
                           ${Object.keys(modulesToImport).join(',\n')}
                        ]
                    `
                }

<<<<<<< HEAD
                const str = createConfigFiles(id, {}, globalConfig)
=======
                const str = createConfigFiles(id, configServer, configClient)
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
                if (str) return str

                for (let module of modules) {
                    let moduleName = resolveModule(module)
                    let variableName = formatVariableName(moduleName);
                    if (
                        id.endsWith(moduleName) || id.includes('virtual-' + variableName)
                    ) {
                        return createModuleLoad(id, variableName, module, {
<<<<<<< HEAD
                            ...resolvedOptions,
                            modulesCreated
                        }, config, globalConfig, cwd());
=======
                            ...options,
                            modulesCreated
                        }, config);
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
                    }
                }
            }
        }
    )

    return plugins
}
