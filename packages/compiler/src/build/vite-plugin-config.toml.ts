import toml from '@iarna/toml';
import fs from 'fs';
import path from 'path';
import { Plugin } from 'vite';
import { ClientBuildConfigOptions } from './client-config';

interface Config {
    modules?: string[]
    startMap?: string
}

const MODULE_NAME = 'virtual-modules'

export default function configTomlPlugin(options: ClientBuildConfigOptions = {}): Plugin {
    let config: Config = {}
    let modules: string[] = []

    function formatVariableName(packageName: string): string {
        packageName = packageName.replace('.', '')
        return packageName.replace(/[.@\/ -]/g, '_');
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
        if (fs.existsSync(path.resolve(process.cwd(), modulePath, folderPath))) {
            const files = fs.readdirSync(path.resolve(process.cwd(), modulePath, folderPath))
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
                        const variableName = formatVariableName(modulePath + ' ' + file)
                        importString = importString + `\nimport ${variableName} from '${modulePath}/${folderPath}/${file}'`
                        return returnCb ? returnCb(file, variableName) : variableName
                    }).join(','),
                importString
            }
        }
        return {
            variablesString: '',
            importString: ''
        }
    }

    function loadServerFiles(modulePath: string) {
        // if player.ts file exists in the module path
        const playerFile = path.resolve(process.cwd(), modulePath, 'player.ts')
        let importString = ''
        if (fs.existsSync(playerFile)) {
            importString = `import player from '${modulePath}/player.ts'`
        }

        // read maps folder and get all the map files

        const mapFilesString = searchFolderAndTransformToImportString('maps', modulePath, '.tmx', (file, variableName) => {
            return `
                {
                    id: '${file.replace('.tmx', '')}',
                    file: ${variableName}
                }
            `
        })

        return `
            import { RpgServer, RpgModule } from '@rpgjs/server'
            ${mapFilesString?.importString}
            ${importString ? importString : 'const player = {}'}
            
            ${config.startMap ? `
                const _lastConnectedCb = player.onConnected
                player.onConnected = async (player) => {
                    if (_lastConnectedCb) await _lastConnectedCb(player)
                    await player.changeMap('${config.startMap}')
                }
            ` : ''}
            @RpgModule<RpgServer>({ 
                player,
                database: {},
                maps: [${mapFilesString?.variablesString}],
                worldMaps: [] 
            })
            export default class RpgServerModuleEngine {} 
        `
    }

    function loadClientFiles(modulePath: string) {
        const playerFile = path.resolve(process.cwd(), modulePath, 'sprite.ts')
        let importString = ''
        let importSceneMapString = ''
        if (fs.existsSync(playerFile)) {
            importString = `import sprite from '${modulePath}/sprite.ts'`
        }
        if (fs.existsSync(path.resolve(process.cwd(), modulePath, 'scene-map.ts'))) {
            importSceneMapString = `import sceneMap from '${modulePath}/scene-map.ts'`
        }

        const guiFilesString = searchFolderAndTransformToImportString('gui', modulePath, '.vue')
        const soundFilesString = searchFolderAndTransformToImportString('sounds', modulePath, ['.mp3', '.ogg']])

        return `
            import { RpgClient, RpgModule } from '@rpgjs/client'
            ${importString}
            ${importSceneMapString}
            ${guiFilesString?.importString}
            ${soundFilesString?.importString}
            
            @RpgModule<RpgClient>({ 
                spritesheets: [],
                sprite: ${importString ? 'sprite' : '{}'},
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
        config() {
            const tomlFile = path.resolve(process.cwd(), 'rpg.toml')
            const jsonFile = path.resolve(process.cwd(), 'rpg.json')
            // if file exists
            if (fs.existsSync(tomlFile)) {
                config = toml.parse(fs.readFileSync(tomlFile, 'utf8'));
            }
            else if (fs.existsSync(jsonFile)) {
                config = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
            }
            if (config.modules) {
                modules = config.modules;
            }
        },
        async resolveId(source) {
            if (source.endsWith(MODULE_NAME)) {
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

                document.addEventListener('DOMContentLoaded', function(e) { 
                    entryPoint(modules, { 
                        io
                    }).start()
                });
              `;
                return codeToTransform
            }
            else if (id.endsWith('virtual-standalone.ts?rpg')) {
                const codeToTransform = `
                import { entryPoint } from '@rpgjs/standalone'
                import modules from './${MODULE_NAME}'

                document.addEventListener('DOMContentLoaded', function() { 
                    entryPoint(modules, { 
                    }).start() 
                })
              `;
                return codeToTransform
            }
            else if (id.endsWith('virtual-server.ts')) {
                const codeToTransform = `
                import { expressServer } from '@rpgjs/server/express'
                import modules from './${MODULE_NAME}'

                expressServer(modules, {
                    basePath: __dirname
                })
              `;
                return codeToTransform
            }

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
