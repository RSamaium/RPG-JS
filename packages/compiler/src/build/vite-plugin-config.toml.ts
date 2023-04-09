import fs from 'fs';
import path from 'path';
import { Plugin } from 'vite';
import { ClientBuildConfigOptions, Config } from './client-config';
import { parseJsonSchema } from '../utils/json-schema.js';
import colors from 'picocolors'
import defaultConfig from './default-config.js'

const MODULE_NAME = 'virtual-modules'
const GLOBAL_CONFIG_CLIENT = 'virtual-config-client'
const GLOBAL_CONFIG_SERVER = 'virtual-config-server'

export default function configTomlPlugin(options: ClientBuildConfigOptions = {}, config: Config): Plugin {
    let modules: string[] = []

    if (config.modules) {
        modules = config.modules;
    }

    let configClient = {}
    let configServer = {}
    let allExtraProps: string[] = []

    const parseSchema = (configFile, moduleName?) => {
        try {
            const value = parseJsonSchema(configFile, config as any)
            if (value.server) {
                configServer = { ...configServer, ...value.server }
            }
            if (value.client) {
                configClient = { ...configClient, ...value.client }
            }
            if (value.extraProps) {
                allExtraProps = [...allExtraProps, ...value.extraProps]
            }
        }
        catch (err: any) {
            let message = colors.red(`Invalidate "${moduleName}" module: ${err.message}`)
            if (!err.missingProperty) {
                throw err
            }
            let helpMessage = `[${err.namespace}]\n  ${err.missingProperty} = YOUR_VALUE`
            if (!moduleName) {
                message = colors.red(`Invalidate config: ${err.message}`)
                helpMessage = `${err.missingProperty} = YOUR_VALUE`
            }
            console.log('----------')
            console.log(message)
            console.log(`${colors.dim('➜')} ${colors.dim(`you need to put the following configuration in rpg.toml:\n\n${helpMessage}`)}`)
            console.log('----------')
        }
    }

    parseSchema(defaultConfig)

    let namespaces: string[] = []
    for (let module of modules) {
        // if module not begins by ., search in node_modules
        if (module[0] != '.') {
            module = path.join('node_modules', module)
        }
        const configPath = path.resolve(process.cwd(), module, 'config.json')
        if (fs.existsSync(configPath)) {
            const configFile: any = fs.readFileSync(configPath, 'utf-8')
            const jsonFile = JSON.parse(configFile)
            if (jsonFile.namespace) namespaces.push(jsonFile.namespace)
            parseSchema(jsonFile, module)
        }
    }

    if (options.side == 'server') { // display one time
        const filterExtraProps = allExtraProps.filter(prop => namespaces.indexOf(prop) == -1)

        if (filterExtraProps.length > 0) {
            console.log(`${colors.yellow(`⚠️  Warning - In rpg.toml, you put the following properties, but they are not used by the modules. Check the names of the properties.`)}`)
            for (let extraProp of filterExtraProps) {
                console.log(`  - ${colors.yellow(extraProp)}`)
            }
        }
    }

    function formatVariableName(packageName: string): string {
        packageName = packageName.replace('.', '')
        return packageName.replace(/[.@\/ -]/g, '_');
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
    ): {
        importString: string,
        variablesString: string
    } {
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
                importString
            }
        }
        return {
            variablesString: '',
            importString: ''
        }
    }

    function importString(modulePath: string, fileName: string, variableName?: string) {
        const playerFile = path.resolve(process.cwd(), modulePath, fileName + '.ts')
        let importString = ''
        if (fs.existsSync(playerFile)) {
            importString = `import ${variableName || fileName} from '${modulePath}/${fileName}.ts'`
        }
        return importString
    }

    function loadServerFiles(modulePath: string) {
        const importPlayer = importString(modulePath, 'player')
        const importEngine = importString(modulePath, 'engine')

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

        return `
            import { RpgServer, RpgModule } from '@rpgjs/server'
            ${mapFilesString?.importString}
            ${worldFilesString?.importString}
            ${importPlayer ? importPlayer : 'const player = {}'}
            ${databaseFilesString?.importString}
            ${importEngine}
            
            ${config.startMap ? `
                const _lastConnectedCb = player.onConnected
                player.onConnected = async (player) => {
                    if (_lastConnectedCb) await _lastConnectedCb(player)
                    await player.changeMap('${config.startMap}')
                }
            ` : ''}
            @RpgModule<RpgServer>({ 
                player,
                ${importEngine ? 'engine,' : ''}
                database: [${databaseFilesString?.variablesString}],
                maps: [${mapFilesString?.variablesString}],
                worldMaps: [${worldFilesString?.variablesString}] 
            })
            export default class RpgServerModuleEngine {} 
        `
    }

    function loadClientFiles(modulePath: string) {
        const importSceneMapString = importString(modulePath, 'scene-map', 'sceneMap')
        const importSpriteString = importString(modulePath, 'sprite')
        const importEngine = importString(modulePath, 'engine')

        const guiFilesString = searchFolderAndTransformToImportString('gui', modulePath, '.vue')
        const soundFilesString = searchFolderAndTransformToImportString('sounds', modulePath, ['.mp3', '.ogg'])

        return `
            import { RpgClient, RpgModule } from '@rpgjs/client'
            ${importSpriteString}
            ${importSceneMapString}
            ${guiFilesString?.importString}
            ${soundFilesString?.importString}
            
            @RpgModule<RpgClient>({ 
                spritesheets: [],
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
        async resolveId(source: string) {
            if (source.endsWith(MODULE_NAME) ||
                source.endsWith(GLOBAL_CONFIG_CLIENT) ||
                source.endsWith(GLOBAL_CONFIG_SERVER)
            ) {
                return source;
            }
            for (let module of modules) {
                if (source === module) {
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
            if (id.endsWith(MODULE_NAME)) {
                const modulesToImport = modules.reduce((acc, module) => {
                    const variableName = formatVariableName(module);
                    acc[variableName] = module;
                    return acc;
                }, {} as Record<string, string>);

                return `
                ${Object.keys(modulesToImport).map((variableName) => `import ${variableName} from '${modulesToImport[variableName]}'`).join('\n')}

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
                        globalConfig
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
                        globalConfigServer
                    }).start() 
                })
              `;
                return codeToTransform
            }
            else if (id.endsWith('virtual-server.ts')) {
                const codeToTransform = `
                import { expressServer } from '@rpgjs/server/express'
                import modules from './${MODULE_NAME}'
                import globalConfig from './${GLOBAL_CONFIG_SERVER}'

                expressServer(modules, {
                    globalConfig,
                    basePath: __dirname
                })
              `;
                return codeToTransform
            }

            const str = createConfigFiles(id)
            if (str) return str

            for (let module of modules) {
                let moduleName = module.replace(/^\./, '')
                let variableName = formatVariableName(moduleName);
                if (id.endsWith(moduleName) || id.includes(variableName)) {
                    return createModuleLoad(id, variableName, module);
                }
            }
        }
    };
}
