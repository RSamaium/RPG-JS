import fs from 'fs';
import path from 'path';
import { Plugin } from 'vite';
import sizeOf from 'image-size';
import { ClientBuildConfigOptions, Config } from './client-config';
import { loadGlobalConfig } from './load-global-config.js';
import { warn } from '../logs/warning.js';
import { OUPUT_DIR_CLIENT_ASSETS, assetsFolder, createDistFolder } from './utils.js';

const MODULE_NAME = 'virtual-modules'
const GLOBAL_CONFIG_CLIENT = 'virtual-config-client'
const GLOBAL_CONFIG_SERVER = 'virtual-config-server'

type ImportObject = {
    importString: string,
    variablesString: string,
    folder: string
}

type ImportImageObject = ImportObject & { propImagesString: string }

export default function configTomlPlugin(options: ClientBuildConfigOptions = {}, config: Config): Plugin | undefined {
    let modules: string[] = []
    let onceCreatePlayerCommand = false

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

    function formatVariableName(packageName: string): string {
        packageName = packageName.replace('.', '')
        return packageName.replace(/[.@\/ -]/g, '_');
    }

    function transformPathIfModule(moduleName) {
        if (moduleName.startsWith('@rpgjs') || moduleName.startsWith('rpgjs')) {
            return 'node_modules/' + moduleName
        }
        return moduleName
    }

    function getAllFiles(dirPath: string): string[] {
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

    function searchFolderAndTransformToImportString(
        folderPath: string,
        modulePath: string,
        extensionFilter: string | string[],
        returnCb?: (file: string, variableName: string) => string
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
                    .map(file => {
                        const relativePath = file.replace(process.cwd(), '.')
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

    function importString(modulePath: string, fileName: string, variableName?: string) {
        const playerFile = path.resolve(process.cwd(), transformPathIfModule(modulePath), fileName + '.ts')
        let importString = ''
        if (fs.existsSync(playerFile)) {
            importString = `import ${variableName || fileName} from '${modulePath}/${fileName}.ts'`
        }
        return importString
    }

    function loadServerFiles(modulePath: string) {
        const importPlayer = importString(modulePath, 'player')
        const importEngine = importString(modulePath, 'server')

        // read maps folder and get all the map files

        const mapFilesString = searchFolderAndTransformToImportString('maps', modulePath, '.tmx', (file, variableName) => {
            return `
                {
                    id: '${file.replace('.tmx', '')}',
                    file: ${variableName}
                }
            `
        })

        const worldFilesString = searchFolderAndTransformToImportString('worlds', modulePath, '.world')
        const databaseFilesString = searchFolderAndTransformToImportString('database', modulePath, '.ts')
        const eventsFilesString = searchFolderAndTransformToImportString('events', modulePath, '.ts')
        
        const code =  `
            import { RpgServer, RpgModule } from '@rpgjs/server'
            ${mapFilesString?.importString}
            ${worldFilesString?.importString}
            ${importPlayer ? importPlayer : 'const player = {}'}
            ${eventsFilesString?.importString}
            ${databaseFilesString?.importString}
            ${importEngine}

            ${onceCreatePlayerCommand? '' : 
            `const _lastConnectedCb = player.onConnected
                player.onConnected = async (player) => {
                    if (_lastConnectedCb) await _lastConnectedCb(player)
                    ${config.start?.graphic ? `player.setGraphic('${config.start?.graphic}')`: ''}
                    ${config.start?.hitbox ? `player.setHitbox(${config.start?.hitbox})`: ''}
                    ${config.startMap ? `await player.changeMap('${config.startMap}')`: ''}
            }`
            }
               
            @RpgModule<RpgServer>({ 
                player,
                events: [${eventsFilesString?.variablesString}],
                ${importEngine ? 'engine,' : ''}
                database: [${databaseFilesString?.variablesString}],
                maps: [${mapFilesString?.variablesString}],
                worldMaps: [${worldFilesString?.variablesString}] 
            })
            export default class RpgServerModuleEngine {} 
        `

        onceCreatePlayerCommand = true
        return code
    }

    function loadSpriteSheet(directoryName: string, modulePath: string, warning = true): ImportImageObject  {
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
                objectString += `"${basename}": "${path.join(projectPath, filename)}",\n`
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

    function loadClientFiles(modulePath: string) {
        const importSceneMapString = importString(modulePath, 'scene-map', 'sceneMap')
        const importSpriteString = importString(modulePath, 'sprite')
        const importEngine = importString(modulePath, 'engine')
        const guiFilesString = searchFolderAndTransformToImportString('gui', modulePath, '.vue')
        const soundFilesString = searchFolderAndTransformToImportString('sounds', modulePath, ['.mp3', '.ogg'])
        let importSpritesheets: ImportImageObject[] = []

        if (config.spritesheetDirectories) {
            importSpritesheets = config.spritesheetDirectories.map(directory => loadSpriteSheet(directory, modulePath))
        }
 
        if (!(config.spritesheetDirectories ?? []).some(dir => dir === 'characters')) {
            importSpritesheets.push(loadSpriteSheet('characters', modulePath, false))
        }

        // remove directory not found
        importSpritesheets = importSpritesheets.filter(importSpritesheet => importSpritesheet.importString)
            
        return `
            import { RpgClient, RpgModule } from '@rpgjs/client'
            ${importSpriteString}
            ${importSceneMapString}
            ${
                importSpritesheets.map(importSpritesheet => importSpritesheet.importString).join('\n')
            }
            ${guiFilesString?.importString}
            ${soundFilesString?.importString}

            ${importSpritesheets.map(importSpritesheet => importSpritesheet.propImagesString).join('\n')}
            
            @RpgModule<RpgClient>({ 
                spritesheets: [
                    ${importSpritesheets.map(importSpritesheet => importSpritesheet.variablesString).join(',\n')}
                ],
                sprite: ${importSpriteString ? 'sprite' : '{}'},
                ${importEngine ? 'engine,' : ''}
                scenes: {
                    ${importSceneMapString ? 'map: sceneMap' : ''}
                },
                gui: [${guiFilesString?.variablesString}],
                sounds: [${soundFilesString?.variablesString}]
            })
            export default class RpgClientModuleEngine {}
        `
    }

    function createModuleLoad(id: string, variableName: string, modulePath: string) {
        const clientFile = `virtual-${variableName}-client.ts`
        const serverFile = `virtual-${variableName}-server.ts`

        if (id.endsWith(serverFile + '?server')) {
            return loadServerFiles(modulePath)
        }
        else if (id.endsWith(clientFile + '?client')) {
            return loadClientFiles(modulePath)
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

    function createConfigFiles(id: string): string | null {
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

            const str = createConfigFiles(id)
            if (str) return str

            for (let module of modules) {
                let moduleName = resolveModule(module)
                let variableName = formatVariableName(moduleName);
                if (
                        id.endsWith(moduleName) || id.includes('virtual-' + variableName) ||
                        id.includes('node_modules/' + moduleName)
                    ) {
                    return createModuleLoad(id, variableName, module);
                }
            }
        }
    };
}
