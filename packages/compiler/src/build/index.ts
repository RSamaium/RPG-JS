import { build } from 'vite'
import { cleanDist } from './clean-dist.js'
import { clientBuildConfig } from './client-config.js'
import { loadConfigFile } from './load-config-file.js'

export type BuildOptions = {
    runtime?: boolean | string
    outputFilename?: string
    outputDir?: string
}

export async function buildMode(props: BuildOptions) {
    const jsonConfig = await loadConfigFile()
    const { outputDir } = props
    
    cleanDist(outputDir)

    process.env.VITE_BUILT = '1'

    const isRpg = process.env.RPG_TYPE == 'rpg'
    const mode: any = process.env.NODE_ENV || 'development'
    
    const buildEnd = async () => {
      
    }

    const cwd = process.cwd()
    
    if (isRpg) {
        const config = await clientBuildConfig(cwd, {
            mode,
            type: 'rpg',
            serveMode: false,
            buildEnd
        }, jsonConfig)
        await build(config)
    }
    else {
        const clientConfig = await clientBuildConfig(cwd, { 
            serveMode: false, 
            buildEnd ,
            mode,
            side: 'client'
        }, jsonConfig)
        await build(clientConfig)
    
        const serverConfig = await clientBuildConfig(cwd, { 
            serveMode: false, 
            buildEnd ,
            mode,
            side: 'server'
        }, jsonConfig)
        await build(serverConfig)
    }
}