/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { clientBuildConfig } from '../build/client-config.js'
import path from 'path'

export default defineConfig(async () => {
    process.env.NODE_ENV = 'test'

    let config = await clientBuildConfig(process.cwd(), {
        mode: 'test',
        serveMode: false,
    })
    const packages = ['client', 'server', 'database', 'testing', 'common', 'standalone', 'types']
    let configResolveAlias = {}
    for (const pkg of packages) {
        configResolveAlias[`@rpgjs/${pkg}`] = path.resolve(__dirname, `../../../${pkg}/src/index.ts`)
    }
    config = {
        ...config,
        resolve: {
            ...config.resolve,
            alias: {
                ...config.resolve.alias,
                ...configResolveAlias
            },
            mainFields: [], 
        }
    }
    return {
        ...config,
        test: {
            environment: 'jsdom',
            threads: false,
            setupFiles: [
                'packages/compiler/src/setupFiles/canvas.ts'
            ]
        }
    }
})