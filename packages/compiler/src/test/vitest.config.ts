/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { clientBuildConfig } from '../build/client-config.js'

export default defineConfig(async () => {
    let config = await clientBuildConfig(process.cwd(), {
        mode: 'test',
        type: 'rpg',
        serveMode: false,
    })
    const packages = ['client', 'server', 'database', 'testing', 'common', 'standalone', 'types']
    let configResolveAlias = {}
    for (const pkg of packages) {
        configResolveAlias[`@rpgjs/${pkg}`] = `packages/${pkg}/src/index.ts`
    }
    config = {
        ...config,
        resolve: {
            ...config.resolve,
            alias: {
                ...config.resolve.alias,
                ...configResolveAlias
            }
        }
    }
    return {
        ...config,
        test: {
            environment: 'jsdom'
        }
    }
})