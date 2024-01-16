/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { clientBuildConfig } from '../build/client-config.js'
import { configDefaults } from 'vitest/config'
import path from 'path'
import { loadConfigFile } from '../build/load-config-file.js'

export default defineConfig(async () => {
    const jsonConfig = await loadConfigFile()
    process.env.NODE_ENV = 'test'

    const testRpgJSProject = process.env.RPGJS_TEST

    let config = await clientBuildConfig(process.cwd(), {
        mode: 'test',
        serveMode: false,
    }, jsonConfig)
    const packages = ['client', 'server', 'database', 'testing', 'common', 'standalone', 'types']
    let configResolveAlias = {}
    if (testRpgJSProject) {
        for (const pkg of packages) {
            configResolveAlias[`@rpgjs/${pkg}`] = path.resolve(__dirname, `../../../${pkg}/src/index.ts`)
         }
    }
    const customVitest = config._projectConfig.vitest
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
                path.join(__dirname, '..', 'setupFiles', 'canvas.ts')
            ],
            exclude: [
                ...configDefaults.exclude, 
                'packages/compiler/**/*'
            ],
            ...(customVitest || {}),
        }
    }
})