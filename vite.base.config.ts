import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import { readFileSync } from 'fs'
import { defaultComposer } from "default-composer"
import type { LibraryFormats } from 'vite'

export const baseConfig = ({ name, baseDir }: { name: string, baseDir: string }, viteOptions = {}) => {
    // Read package.json from the current directory
    const packageJsonPath = resolve(baseDir, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
    
    // Get all dependencies
    const dependencies = Object.keys({
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {},
        ...packageJson.peerDependencies || {}
    })

    const config = defaultComposer({
        build: {
            ssr: {
                target: 'node'
            },
            lib: {
                entry: resolve(baseDir, 'src/index.ts'),
                name: `@rpgjs/${name}`,
                formats: ['es'] as LibraryFormats[]
            },
            rollupOptions: {
                external: dependencies,
                output: {
                    preserveModules: true,
                    preserveModulesRoot: 'src',
                    entryFileNames: '[name].js'
                }
            },
            outDir: 'lib',
            emptyOutDir: false,
            sourcemap: true,
            minify: false,
            target: 'esnext'
        },
        plugins: [
            dts({
                outDir: 'lib',
                include: ['src'],
                exclude: ['**/*.test.ts', '**/*.spec.ts'],
                rollupTypes: true,
                compilerOptions: {
                    preserveSymlinks: true,
                    skipLibCheck: true,
                    declaration: true,
                    emitDeclarationOnly: true,
                    allowJs: true,
                    esModuleInterop: true
                },
                clearPureImport: true,
                copyDtsFiles: true,
                insertTypesEntry: true
            })
        ],
        esbuild: {
            keepNames: true
        }
    }, viteOptions)

    return defineConfig(config)
}

