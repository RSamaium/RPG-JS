import fs from 'fs';
import path from 'path';
import toml from '@iarna/toml';
import { UserConfig } from 'vite';
import * as glob from 'glob'

export function dd(strings: TemplateStringsArray, ...values: any[]) {
    const fullString = strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');

    // Find common indentation
    const lines = fullString.split('\n');
    let minIndent = Infinity;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        const indent = line.match(/^\s*/)?.[0].length || 0;
        if (indent < minIndent) minIndent = indent;
    }

    if (minIndent === Infinity) return fullString;

    return lines.map(line => {
        if (line.trim().length === 0) return line;
        return line.slice(minIndent);
    }).join('\n').trim();
}


export function formatVariableName(packageName: string): string {
    packageName = packageName.replace(/\./g, '')
    return packageName.replace(/[.@\/ -]/g, '_');
}

export function transformPathIfModule(moduleName: string): string {
    if (moduleName.startsWith('@rpgjs') || moduleName.startsWith('rpgjs')) {
        return 'node_modules/' + moduleName
    }
    return moduleName
}

export function getAllFiles(dirPath: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dirPath)) return files;
    const dirents = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const dirent of dirents) {
        const fullPath = path.join(dirPath, dirent.name);
        if (dirent.isDirectory()) {
            const nestedFiles = getAllFiles(fullPath);
            files.push(...nestedFiles);
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

export type ImportObject = {
    importString: string,
    variablesString: string,
    folder: string,
    relativePath: string
}

export function searchFolderAndTransformToImportString(
    folderPath: string,
    modulePath: string,
    extensionFilter: string | string[],
    returnCb?: (file: string, variableName: string) => string,
    options?: {
        customFilter?: (file: string) => boolean
<<<<<<< HEAD
    },
    projectRoot?: string
): ImportObject {
    let importString = ''
    let fileRelativePath = ''
    const { cwd } = process
    const root = projectRoot || cwd()
    const folder = path.resolve(root, modulePath, folderPath)
=======
    }
): ImportObject {
    let importString = ''
    let fileRelativePath = ''
    const folder = path.resolve(modulePath, folderPath)
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
    if (fs.existsSync(folder)) {
        // read recursive folder and get all the files (flat array)
        const files = getAllFiles(folder)
        return {
            variablesString: files
                .filter(file => {
                    if (typeof extensionFilter === 'string') {
                        return file.endsWith(extensionFilter)
                    }
                    else {
                        return extensionFilter.some(ext => file.endsWith(ext))
                    }
                })
                .filter(file => {
                    if (options?.customFilter) {
                        return options.customFilter(file)
                    }
                    return true
                })
                .map(file => {
                    // Convert file path to use @/ alias if under src/
<<<<<<< HEAD
                    // For files not under src/, use path relative to project root
                    const srcPath = path.join(root, 'src')
=======
                    const { cwd } = process
                    const srcPath = path.join(cwd(), 'src')
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
                    let importPath: string
                    
                    if (file.startsWith(srcPath)) {
                        // File is under src/, use @/ alias
                        const relativeToSrc = path.relative(srcPath, file)
                        importPath = `@/${toPosix(relativeToSrc)}`
                    } else {
<<<<<<< HEAD
                        // File is not under src/, use path relative to project root
                        const relativeToRoot = path.relative(root, file)
                        importPath = `./${toPosix(relativeToRoot)}`
=======
                        // File is not under src/, use relative path from cwd
                        const _relativePath = relativePath(file)
                        importPath = toPosix(_relativePath)
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
                    }
                    
                    const variableName = formatVariableName(importPath)
                    fileRelativePath = importPath
                    importString = importString + `\nimport ${variableName} from '${importPath}'`
                    return returnCb ? returnCb(importPath, variableName) : variableName
                }).join(','),
            importString,
            folder,
            relativePath: fileRelativePath
        }
    }
    return {
        variablesString: '',
        importString: '',
        folder: '',
        relativePath: ''
    }
}

<<<<<<< HEAD
export function importString(modulePath: string, fileName: string, variableName?: string, projectRoot?: string) {
    const { cwd } = process
    const root = projectRoot || cwd()
    const transformedModulePath = transformPathIfModule(modulePath)
    const playerFile = path.resolve(root, transformedModulePath, fileName + '.ts')
=======
export function importString(modulePath: string, fileName: string, variableName?: string) {
    const { cwd } = process
    const transformedModulePath = transformPathIfModule(modulePath)
    const playerFile = path.resolve(cwd(), transformedModulePath, fileName + '.ts')
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
    let importStr = ''
    if (fs.existsSync(playerFile)) {
        // Convert file path to use @/ alias for imports from virtual files
        // Example: './src/modules/main/player.ts' -> '@/modules/main/player.ts'
<<<<<<< HEAD
        // For files not under src/, use path relative to project root
        let importPath: string
        
        // Check if the resolved file is under src/
        const srcPath = path.join(root, 'src')
=======
        let importPath: string
        
        // Check if the resolved file is under src/
        const srcPath = path.join(cwd(), 'src')
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
        
        if (playerFile.startsWith(srcPath)) {
            // File is under src/, use @/ alias
            const relativeToSrc = path.relative(srcPath, playerFile)
            importPath = `@/${toPosix(relativeToSrc)}`
        } else {
<<<<<<< HEAD
            // File is not under src/, use path relative to project root (works from virtual files)
            const relativeToRoot = path.relative(root, playerFile)
            importPath = `./${toPosix(relativeToRoot)}`
=======
            // File is not under src/, use relative path from cwd
            const relativeToCwd = path.relative(cwd(), playerFile)
            importPath = `./${toPosix(relativeToCwd)}`
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
        }
        importStr = `import ${variableName || fileName} from '${importPath}'`
    }
    return importStr
}

// Types based on usage
export interface ClientBuildConfigOptions {
    server?: boolean;
    serveMode?: boolean;
    type?: 'rpg' | 'mmorpg';
    side?: 'client' | 'server';
    build?: {
        outputDir?: string;
    }
}

export interface Config {
    modules?: string[];
    inputs?: Record<string, { bind: string | string[] }>;
    start?: {
        graphic?: string;
        hitbox?: [number, number];
    };
    startMap?: string;
    spritesheetDirectories?: string[];
    autostart?: boolean;
    vite?: UserConfig;
    compilerOptions?: {
        build?: {
            outputDir?: string;
        }
    }
}

export function loadGlobalConfig(modules: string[], config: Config, options: ClientBuildConfigOptions) {
    // Basic implementation or mock
    return {
        configClient: {},
        configServer: {}
    }
}

export function loadRpgToml(root: string): Config {
    const tomlPath = path.resolve(root, 'rpg.toml');
    if (fs.existsSync(tomlPath)) {
        try {
            const content = fs.readFileSync(tomlPath, 'utf-8');
            return toml.parse(content) as unknown as Config;
        } catch (e) {
            warn(`Error parsing rpg.toml: ${e}`);
        }
    }
    return {};
}

export function warn(message: string) {
    console.warn(`[RPG-JS V4 Compatibility] ${message}`);
}

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

<<<<<<< HEAD
export function replaceEnvVars(obj: any, envs: Record<string, any>): any {
=======
export function replaceEnvVars(obj, envs) {
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
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
<<<<<<< HEAD
        return Object.entries(obj).reduce((acc: Record<string, any>, [key, value]) => {
=======
        return Object.entries(obj).reduce((acc, [key, value]) => {
>>>>>>> chore: update dependencies and enhance Vite configuration for TiledMap
            acc[key] = replaceEnvVars(value, envs);
            return acc;
        }, {});
    }

    return obj
}