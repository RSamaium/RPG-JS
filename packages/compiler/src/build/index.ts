import { build } from 'vite'
import { cleanDist } from './clean-dist.js'
import { clientBuildConfig } from './client-config.js'

export async function buildMode() {
    cleanDist()
    const buildEnd = async () => {
      
    }
    const cwd = process.cwd()
    const clientConfig = await clientBuildConfig(cwd, { 
        serveMode: false, 
        buildEnd ,
        mode: 'production',
        side: 'client'
    })
    await build(clientConfig)

    const serverConfig = await clientBuildConfig(cwd, { 
        serveMode: false, 
        buildEnd ,
        mode: 'production',
        side: 'server'
    })
    await build(serverConfig)
}