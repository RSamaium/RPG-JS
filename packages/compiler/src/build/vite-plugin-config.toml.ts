import fs from 'fs';
import path from 'path';
import { Plugin } from 'vite';
import sizeOf from 'image-size';
import { ClientBuildConfigOptions, Config } from './client-config';
import { loadGlobalConfig } from './load-global-config.js';
import { warn } from '../logs/warning.js';
import { assetsFolder, extractProjectPath, toPosix } from './utils.js';

const MODULE_NAME = 'virtual-modules'
const GLOBAL_CONFIG_CLIENT = 'virtual-config-client'
const GLOBAL_CONFIG_SERVER = 'virtual-config-server'

type ImportObject = {
    importString: string,
    variablesString: string,
    folder: string
}

type ImportImageObject = ImportObject & { propImagesString: string }

export function formatVariableName(packageName: string): string {
    packageName = packageName.replace(/\./g, '')
    return packageName.replace(/[.@\/ -]/g, '_');
}

export function transformPathIfModule(moduleName: string): string {
    if (moduleName.startsWith('@rpgjs') || moduleName.startsWith('rpgjs')) {
        return 'node_modules/' + moduleName
    }
    return moduleName
}

export function getAllFiles(dirPath: string): string[] {
    const files: string[] = [];

    const dirents = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const dirent of dirents) {
        const fullPath = path.join(dirPath, dirent.name);
        if (dirent.isDirectory()) {
            const nestedFiles = getAllFiles(fullPath);
            files.push(...nestedFiles);
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

export function searchFolderAndTransformToImportString(
    folderPath: string,
    modulePath: string,
    extensionFilter: string | string[],
    returnCb?: (file: string, variableName: string) => string,
    options?: {
        customFilter?: (file: string) => boolean
    }
): ImportObject {
    let importString = ''
    const folder = path.resolve(modulePath, folderPath)
    if (fs.existsSync(folder)) {
        // read recursive folder and get all the files (flat array)
        const files = getAllFiles(folder)
        return {
            variablesString: files
                .filter(file => {
                    if (typeof extensionFilter === 'string') {
                        return file.endsWith(extensionFilter)
                    }
                    else {
                        return extensionFilter.some(ext => file.endsWith(ext))
                    }
                })
                .filter(file => {
                    if (options?.customFilter) {
                        return options.customFilter(file)
                    }
                    return true
                })
                .map(file => {
                    const relativePath = toPosix(file.replace(process.cwd(), '.'))
                    const variableName = formatVariableName(relativePath)
                    importString = importString + `\nimport ${variableName} from '${relativePath}'`
                    return returnCb ? returnCb(relativePath, variableName) : variableName
                }).join(','),
            importString,
            folder
        }
    }
    return {
        variablesString: '',
        importString: '',
        folder: ''
    }
}

export function importString(modulePath: string, fileName: string, variableName?: string) {
    const playerFile = path.resolve(process.cwd(), transformPathIfModule(modulePath), fileName + '.ts')
    let importString = ''
    if (fs.existsSync(playerFile)) {
        importString = `import ${variableName || fileName} from '${modulePath}/${fileName}.ts'`
    }
    return importString
}

export function loadServerFiles(modulePath: string, options, config) {
    let onceCreatePlayerCommand = false
    const { modulesCreated } = options
    if (!modulesCreated.includes(modulePath)) modulesCreated.push(modulePath)
    const importPlayer = importString(modulePath, 'player')
    const importEngine = importString(modulePath, 'server')

    // read maps folder and get all the map files

    const mapStandaloneFilesString = searchFolderAndTransformToImportString('maps', modulePath, '.ts')
    const mapFilesString = searchFolderAndTransformToImportString('maps', modulePath, '.tmx', (file, variableName) => {
        return `
            {
                id: '${file.replace('.tmx', '')}',
                file: ${variableName}
            }
        `
    }, {
        customFilter: (file) => {
            // if .ts exists with same name, do not import the .tmx
            const tsFile = file.replace('.tmx', '.ts')
            if (fs.existsSync(tsFile)) {
                return false
            }
            return true
        }
    })
    const hasMaps = !!mapFilesString?.variablesString

    const worldFilesString = searchFolderAndTransformToImportString('worlds', modulePath, '.world')
    const databaseFilesString = searchFolderAndTransformToImportString('database', modulePath, '.ts')
    const eventsFilesString = searchFolderAndTransformToImportString('events', modulePath, '.ts')

    const code = `
        import { RpgServer, RpgModule } from '@rpgjs/server'
        ${mapFilesString?.importString}
        ${mapStandaloneFilesString?.importString}
        ${worldFilesString?.importString}
        ${importPlayer ? importPlayer : 'const player = {}'}
        ${eventsFilesString?.importString}
        ${databaseFilesString?.importString}
        ${importEngine}

        ${modulesCreated.length == 1 ? `const _lastConnectedCb = player.onConnected
            player.onConnected = async (player) => {
                if (_lastConnectedCb) await _lastConnectedCb(player)
                ${config.start?.graphic ? `player.setGraphic('${config.start?.graphic}')` : ''}
                ${config.start?.hitbox ? `player.setHitbox(${config.start?.hitbox})` : ''}
                ${config.startMap ? `await player.changeMap('${config.startMap}')` : ''}
            }` : ''
        }
           
        @RpgModule<RpgServer>({ 
            player,
            events: [${eventsFilesString?.variablesString}],
            ${importEngine ? `engine: server,` : ''}
            database: [${databaseFilesString?.variablesString}],
            maps: [${mapFilesString?.variablesString}${hasMaps ? ',' : ''}${mapStandaloneFilesString?.variablesString}],
            worldMaps: [${worldFilesString?.variablesString}] 
        })
        export default class RpgServerModuleEngine {} 
    `
    return code
}

export function loadSpriteSheet(directoryName: string, modulePath: string, options, warning = true): ImportImageObject {
    const importSprites = searchFolderAndTransformToImportString(directoryName, modulePath, '.ts')
    let propImagesString = ''
    if (importSprites?.importString) {
        const folder = importSprites.folder
        let objectString = ''
        // get all images in the folder
        let lastImagePath = ''
        const projectPath = folder.replace(process.cwd(), '/')
        //console.log(modulePath, folder)
        getAllFiles(folder).filter(file => {
            const ext = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg']
            return ext.some(e => file.toLowerCase().endsWith(e))
        }).forEach(async file => {
            // get basename without extension
            const filename = path.basename(file)
            const basename = filename.replace(path.extname(file), '')
            // move image to assets folder, if build
            if (options.serveMode === false) {
                const dest = path.join(assetsFolder(options.type === 'rpg' ? 'standalone' : 'client'), filename)
                fs.copyFileSync(file, dest)
            }
            lastImagePath = file
            objectString += `"${basename}": "${toPosix(extractProjectPath(file, projectPath.replace(/^\/+/, '')))}",\n`
        })
        const dimensions = sizeOf(lastImagePath)
        propImagesString = `
            ${importSprites?.variablesString}.images = {
                ${objectString}
            }
            ${importSprites?.variablesString}.prototype.width = ${dimensions.width}
            ${importSprites?.variablesString}.prototype.height = ${dimensions.height}
        `
    }
    else if (warning) {
        warn(`No spritesheet folder found in ${directoryName} folder`)
    }
    return {
        ...importSprites,
        propImagesString
    }
}

export function loadClientFiles(modulePath: string, options, config) {
    const importSceneMapString = importString(modulePath, 'scene-map', 'sceneMap')
    const importSpriteString = importString(modulePath, 'sprite')
    const importEngine = importString(modulePath, 'client', 'engine')
    const guiFilesString = searchFolderAndTransformToImportString('gui', modulePath, '.vue')
    const soundFilesString = searchFolderAndTransformToImportString('sounds', modulePath, ['.mp3', '.ogg'])
    let importSpritesheets: ImportImageObject[] = []

    if (config.spritesheetDirectories) {
        importSpritesheets = config.spritesheetDirectories.map(directory => loadSpriteSheet(directory, modulePath, options))
    }

    if (!(config.spritesheetDirectories ?? []).some(dir => dir === 'characters')) {
        importSpritesheets.push(loadSpriteSheet('characters', modulePath, options, false))
    }

    // remove directory not found
    importSpritesheets = importSpritesheets.filter(importSpritesheet => importSpritesheet.importString)

    return `
        import { RpgClient, RpgModule } from '@rpgjs/client'
        ${importSpriteString}
        ${importSceneMapString}
        ${importEngine}
        ${importSpritesheets.map(importSpritesheet => importSpritesheet.importString).join('\n')
        }
        ${guiFilesString?.importString}
        ${soundFilesString?.importString}

        ${importSpritesheets.map(importSpritesheet => importSpritesheet.propImagesString).join('\n')}
        
        @RpgModule<RpgClient>({ 
            spritesheets: [ ${importSpritesheets.map(importSpritesheet => importSpritesheet.variablesString).join(',\n')} ],
            sprite: ${importSpriteString ? 'sprite' : '{}'},
            ${importEngine ? `engine,` : ''}
            scenes: { ${importSceneMapString ? 'map: sceneMap' : ''} },
            gui: [${guiFilesString?.variablesString}],
            sounds: [${soundFilesString?.variablesString}]
        })
        export default class RpgClientModuleEngine {}
    `
}

export function createModuleLoad(id: string, variableName: string, modulePath: string, options, config) {
    const clientFile = `virtual-${variableName}-client.ts`
    const serverFile = `virtual-${variableName}-server.ts`

    if (id.endsWith(serverFile + '?server')) {
        return loadServerFiles(modulePath, options, config)
    }
    else if (id.endsWith(clientFile + '?client')) {
        return loadClientFiles(modulePath, options, config)
    }

    const modulePathId = path.join(process.cwd(), id)
    const packageJson = path.join(modulePathId, 'package.json')
    const indexFile = path.join(modulePathId, 'index.ts')

    if (fs.existsSync(packageJson)) {
        const { main: entryPoint } = JSON.parse(fs.readFileSync(packageJson, 'utf-8'))
        if (entryPoint) {
            return `
                import mod from '${path.join(modulePathId, entryPoint)}'
                export default mod
            `
        }
    }
    else if (fs.existsSync(indexFile)) {
        return `
            import mod from '${indexFile}'
            export default mod
        `
    }

    return `
        import client from 'client!./${clientFile}'
        import server from 'server!./${serverFile}'
        
        export default {
            client,
            server
        } 
    `
}

export function createConfigFiles(id: string, configServer, configClient): string | null {
    if (id.endsWith(GLOBAL_CONFIG_SERVER)) {

        return `
            export default ${JSON.stringify(configServer)}
        `
    }
    if (id.endsWith(GLOBAL_CONFIG_CLIENT)) {
        return `
            export default ${JSON.stringify(configClient)}
        `
    }
    return null
}

function resolveModule(name: string) {
    return name.replace(/^.\//, '')
}

export default function configTomlPlugin(options: ClientBuildConfigOptions = {}, config: Config): Plugin | undefined {
    let modules: string[] = []
    let modulesCreated = []

    if (config.modules) {
        modules = config.modules;
    }

    config.startMap = config.startMap || config.start?.map

    let ret
    try {
        ret = loadGlobalConfig(modules, config, options)
    }
    catch (err) {
        if (options.side == 'server') process.exit()
    }

    if (!ret) return

    const { configClient, configServer } = ret

    return {
        name: 'vite-plugin-config-toml',
        transformIndexHtml: {
            enforce: 'pre',
            transform(html) {
                // if find src/client.ts, import src/client.ts else mmorpg!virtual-client.ts
                const clientFile = path.resolve(process.cwd(), 'src', 'client.ts')
                const importStr = fs.existsSync(clientFile) ? 'mmorpg!./src/client.ts' : 'mmorpg!virtual-client.ts'

                // if find src/standalone.ts, import src/standalone.ts else mmorpg!virtual-standalone.ts
                const standaloneFile = path.resolve(process.cwd(), 'src', 'standalone.ts')
                const importStrStandalone = fs.existsSync(standaloneFile) ? 'rpg!./src/standalone.ts' : 'rpg!virtual-standalone.ts'

                return html.replace('<head>', `
                <head>
                <script type="module">
                    import '${importStr}'
                    import '${importStrStandalone}'
                </script>`);
            }
        },
        handleHotUpdate() {
            modulesCreated = []
        },
        async resolveId(source: string, importer) {
            if (source.endsWith(MODULE_NAME) ||
                source.endsWith(GLOBAL_CONFIG_CLIENT) ||
                source.endsWith(GLOBAL_CONFIG_SERVER)
            ) {
                return source;
            }
            for (let module of modules) {
                if (source === resolveModule(module)) {
                    return source
                }
            }
            if (
                (source.includes('virtual') && (!source.endsWith('virtual-server.ts') && options.serveMode)) ||
                (source.includes('virtual') && !options.serveMode)
            ) {
                return source;
            }
        },
        async load(id: string) {
            const serverUrl = process.env.VITE_SERVER_URL
            const envsString = `{
                VITE_BUILT: ${process.env.VITE_BUILT},
                VITE_SERVER_URL: ${serverUrl ? "'" + serverUrl + "'" : 'undefined'}
            }`
            if (id.endsWith(MODULE_NAME)) {
                const modulesToImport = modules.reduce((acc, module) => {
                    const variableName = formatVariableName(module);
                    acc[variableName] = module;
                    return acc;
                }, {} as Record<string, string>);

                return `
                ${Object.keys(modulesToImport).map((variableName) => `import ${variableName} from '${resolveModule(modulesToImport[variableName])}'`).join('\n')}

                export default [
                   ${Object.keys(modulesToImport).join(',\n')}
                ]
                `
            }
            else if (id.endsWith('virtual-client.ts?mmorpg')) {
                const codeToTransform = `
                import { entryPoint } from '@rpgjs/client'
                import io from 'socket.io-client'
                import modules from './${MODULE_NAME}'
                import globalConfig from './${GLOBAL_CONFIG_CLIENT}'

                document.addEventListener('DOMContentLoaded', function(e) { 
                    entryPoint(modules, { 
                        io,
                        globalConfig,
                        envs: ${envsString}
                    }).start()
                });
              `;
                return codeToTransform
            }
            else if (id.endsWith('virtual-standalone.ts?rpg')) {
                const codeToTransform = `
                import { entryPoint } from '@rpgjs/standalone'
                import globalConfigClient from './${GLOBAL_CONFIG_CLIENT}'
                import globalConfigServer from './${GLOBAL_CONFIG_SERVER}'
                import modules from './${MODULE_NAME}'

                document.addEventListener('DOMContentLoaded', function() { 
                    entryPoint(modules, {
                        globalConfigClient,
                        globalConfigServer,
                        envs: ${envsString}
                    }).start() 
                })
              `;
                return codeToTransform
            }
            else if (id.endsWith('virtual-server.ts')) {
                const codeToTransform = `
                import { expressServer } from '@rpgjs/server/express'
                import * as url from 'url'
                import modules from './${MODULE_NAME}'
                import globalConfig from './${GLOBAL_CONFIG_SERVER}'

                const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

                expressServer(modules, {
                    globalConfig,
                    basePath: __dirname,
                    envs: ${envsString}
                })
              `;
                return codeToTransform
            }

            const str = createConfigFiles(id, configServer, configClient)
            if (str) return str

            for (let module of modules) {
                let moduleName = resolveModule(module)
                let variableName = formatVariableName(moduleName);
                if (
                    id.endsWith(moduleName) || id.includes('virtual-' + variableName)
                ) {
                    return createModuleLoad(id, variableName, module, {
                        ...options,
                        modulesCreated
                    }, config);
                }
            }
        }
    };
}
