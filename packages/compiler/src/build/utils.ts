import path from 'path'
import fs from 'fs'
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