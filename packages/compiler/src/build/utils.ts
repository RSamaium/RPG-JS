import path from 'path'
import fs from 'fs';
import * as glob from 'glob'

export const OUPUT_DIR_CLIENT_ASSETS = 'dist/client/assets'

export const entryPointServer = (entryPointPath?: string): string => {
    // entryPointPath or src/server.ts, if exists, or virtual-server.ts
    const entryPoint = entryPointPath || path.resolve(process.cwd(), 'src/server.ts')
    if (fs.existsSync(entryPoint)) {
        return path.resolve(entryPoint)
    }
    return 'virtual-server.ts'
}

export const globFiles = (extension: string): string[] => {
    return [
        ...glob.sync('**/*.' + extension, { nodir: true, ignore: ['node_modules/**', 'dist/**'] }),
        ...glob.sync('node_modules/rpgjs-*/*.' + extension, { nodir: true }),
        ...glob.sync('node_modules/@rpgjs/**/*.' + extension, { nodir: true })
    ]
}

export const assetsFolder = (outputDir: string): string => {
    return path.join('dist', outputDir, 'assets')
}

export const createDistFolder = async  (outputDir: string): Promise<string> => {
    const assetDir = assetsFolder(outputDir)
    fs.mkdirSync(assetDir, { recursive: true })
    return assetDir
}

export function toPosix(path: string) {
    return path.replace(/\\/g, '/')
}