import path from 'path'
import { globFiles } from './utils.js'
import { info } from '../logs/warning.js'

export function worldTransformPlugin() {
    return {
        name: 'transform-world',
        transform(source, id) {
            if (id.endsWith('.world')) {
                const directory = path.dirname(id).replace(process.cwd() + '/', '')
                const world = JSON.parse(source)
                world.basePath = directory
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
                    /* open file
                    const data = await fs.readFile(file, 'utf-8');
                    axios.post(serverUrl + '/api/map/update', {
                        mapFile: file,
                        data
                    })
                    */
                }
            })
        }
    }
}