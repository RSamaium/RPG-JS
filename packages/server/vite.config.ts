import { resolve } from "path"
import { baseConfig } from "../../vite.base.config"

export default baseConfig({ 
    name: 'server', 
    baseDir: __dirname,
}, {
    build: {     
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
                'express/server': resolve(__dirname, 'src/express/server.ts'),
            }
        }
    }
})