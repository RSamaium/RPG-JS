import path from 'path'
import { transform } from 'typescript';

export function mapExtractPlugin() {
    return {
        name: 'map-extract',

        configureServer(server) {
            const { root } = server.config
            server.watcher.on('all', (event, _path) => {
                console.log(_path)
                const ext = path.extname(_path)
                if (event == 'add' || event == 'change') {
                    if (['.tsx', '.tmx'].includes(ext)) {
                        //console.log(_path)
                    }
                }
            })
        },

        transform(code, id) {
            const ext = path.extname(id)
            if (['.tsx', '.tmx'].includes(ext)) {
                //console.log(code)
                //this.watchChange(id)
            }
            return null
        },

        load(id) {
            const ext = path.extname(id)
            if (['.tsx', '.tmx'].includes(ext)) {
                //console.log(id)
                //this.watchChange(id)
            }
            return null
        },

        watchChange(id) {
           // console.log(id)
        }
    }
}