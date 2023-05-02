import path from 'path'
import { globFiles } from './utils.js'
import crypto from 'crypto'
import { info } from '../logs/warning.js'
import fs from 'fs-extra';
import axios from 'axios';

export function worldTransformPlugin(serverUrl: string) {

    function extendsWorld(world, filePath: string) {
        const relativePath = filePath.replace(process.cwd() + '/', '')
        const directory = path.dirname(relativePath)
        const worldId = crypto.createHash('md5').update(relativePath).digest('hex')
        world.basePath = directory
        world.id = worldId
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
                    const data = await fs.readFile(file, 'utf-8');
                    const world = extendsWorld(JSON.parse(data), file)
                    axios.put(serverUrl + '/api/worlds', {
                        worldId: world.id,
                        data: world
                    })
                }
            })
        }
    }
}