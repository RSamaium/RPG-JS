import path from 'path'
import { globFiles, relativePath } from './utils.js'
import crypto from 'crypto'
import { errorApi, info } from '../logs/warning.js'
import fs from 'fs';
import axios from '../serve/api.js';

export function worldTransformPlugin(serverUrl?: string) {

    function extendsWorld(world, filePath: string) {
        const _relativePath = relativePath(filePath)
        const directory = path.dirname(_relativePath)
        world.basePath = directory
        world.id = _relativePath
        return world
    }

    return {
        name: 'transform-world',
        transform(source, id) {
            if (id.endsWith('.world')) {
                const world = extendsWorld(JSON.parse(source), id)
                return {
                    code: `export default ${JSON.stringify(world)}`,
                    map: null
                }
            }
        },
        configureServer(server) {
            server.watcher.add(globFiles('world'));

            server.watcher.on('change', async (file: string) => {
                if (file.endsWith('world')) {
                    info(`File ${file} changed, updating world...`)
                    const data = fs.readFileSync(file, 'utf-8');
                    const world = extendsWorld(JSON.parse(data), file)
                    axios.put(serverUrl + '/api/worlds', {
                        worldId: world.id,
                        data: world
                    }).catch(errorApi)
                }
            })
        }
    }
}