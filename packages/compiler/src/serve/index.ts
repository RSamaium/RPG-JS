import { build } from 'vite'
import { clientBuildConfig } from '../build/client-config.js'
import { runServer } from './run-server.js'

export async function devMode() {
    const buildEnd = async () => {
       await runServer()
    }
    const config = await clientBuildConfig(process.cwd(), { serveMode: true, buildEnd })
    await build(config)
}