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
    return path.join(outputDir, 'assets')
}

export const createDistFolder = async (outputDir: string): Promise<string> => {
    const assetDir = assetsFolder(outputDir)
    fs.mkdirSync(assetDir, { recursive: true })
    return assetDir
}

export function toPosix(path: string) {
    return path.replace(/\\/g, '/')
}

export function relativePath(file: string): string {
    const { cwd } = process
    return toPosix(
        './' + toPosix(path.relative(cwd(), file))
    )
}

/**
 * Example:
 * 
 * const projectPath = extractProjectPath('/home/user/project/RPG-JS-v4/packages/sample2/main/characters/npc', '/main/characters')
 * console.log(projectPath) // /main/characters/npc
 */
export function extractProjectPath(absolutePath: string, projectPath: string): string {
    const projectIndex = absolutePath.indexOf(projectPath);

    if (projectIndex === -1) {
        throw new Error('Project path not found in absolute path');
    }

    const extractedPath = absolutePath.substring(projectIndex);

    return extractedPath;
}

export function replaceEnvVars(obj, envs) {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string' && obj.startsWith('$ENV:')) {
        const envVar = obj.slice(5);
        return envs[envVar]
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => replaceEnvVars(item, envs));
    }

    if (typeof obj == 'object') {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            acc[key] = replaceEnvVars(value, envs);
            return acc;
        }, {});
    }

    return obj
}