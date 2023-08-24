/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { clientBuildConfig } from '../build/client-config.js'
import { configDefaults } from 'vitest/config'
import path from 'path'

export default defineConfig(async () => {
    process.env.NODE_ENV = 'test'

    const testRpgJSProject = process.env.RPGJS_TEST

    let config = await clientBuildConfig(process.cwd(), {
        mode: 'test',
        serveMode: false,
    })
    const packages = ['client', 'server', 'database', 'testing', 'common', 'standalone', 'types']
    let configResolveAlias = {}
    if (testRpgJSProject) {
        for (const pkg of packages) {
            configResolveAlias[`@rpgjs/${pkg}`] = path.resolve(__dirname, `../../../${pkg}/src/index.ts`)
         }
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
                path.join(__dirname, '..', 'setupFiles', 'canvas.ts')
            ],
            exclude: [
                ...configDefaults.exclude, 
                'packages/compiler/**/*'
            ]
        }
    }
})