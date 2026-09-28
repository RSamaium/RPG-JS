import { Plugin } from 'vite';
import colors from 'picocolors';
import { addDevBannerEntry } from './dev-banner';
import { readFileSync, existsSync, statSync, readdirSync, copyFileSync, mkdirSync } from 'fs';
import { join, extname, relative, dirname } from 'path';

export interface DataFolderPluginOptions {
    /**
     * Source folder containing the data files (TMX, TSX, images)
     */
    sourceFolder: string;
    
    /**
     * Public path prefix for accessing the data files
     * @default '/data'
     */
    publicPath?: string;
    
    /**
     * Target folder in build output for the data files
     * @default 'assets/data'
     */
    buildOutputPath?: string;
    
    /**
     * File extensions to include
     * @default ['.tmx', '.tsx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
     */
    allowedExtensions?: string[];
}

/**
 * Vite plugin that serves a data folder in development mode and copies it to assets during build
 * 
 * This plugin allows serving game data files (TMX maps, TSX tilesets, images) during development
 * and automatically includes them in the build output for production deployment.
 * 
 * @param options - Configuration options for the plugin
 * 
 * @example
 * ```js
 * // In vite.config.ts
 * import { defineConfig } from 'vite';
 * import { dataFolderPlugin } from '@rpgjs/vite';
 * 
 * export default defineConfig({
 *   plugins: [
 *     dataFolderPlugin({
 *       sourceFolder: './game-data',
 *       publicPath: '/data',
 *       buildOutputPath: 'assets/data'
 *     })
 *   ]
 * });
 * ```
 */
export function tiledMapFolderPlugin(options: DataFolderPluginOptions): Plugin {
    const {
        sourceFolder,
        publicPath = '/data',
        buildOutputPath = 'assets/data',
        allowedExtensions = ['.tmx', '.tsx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
    } = options;

    let isBuild = false;
    let outputDir = 'dist';

    /**
     * Get MIME type based on file extension
     */
    const getMimeType = (filePath: string): string => {
        const ext = extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.tmx': 'application/xml',
            '.tsx': 'application/xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    };

    /**
     * Check if file extension is allowed
     */
    const isAllowedFile = (filePath: string): boolean => {
        const ext = extname(filePath).toLowerCase();
        return allowedExtensions.includes(ext);
    };

    /**
     * Recursively get all files from a directory
     */
    const getAllFiles = (dirPath: string, basePath: string = dirPath): string[] => {
        const files: string[] = [];
        
        if (!existsSync(dirPath)) {
            return files;
        }

        const items = readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = join(dirPath, item);
            const stat = statSync(fullPath);
            
            if (stat.isDirectory()) {
                files.push(...getAllFiles(fullPath, basePath));
            } else if (isAllowedFile(fullPath)) {
                files.push(fullPath);
            }
        }
        
        return files;
    };

    /**
     * Copy files to build output directory
     */
    const copyFilesToBuild = (outputPath: string) => {
        const files = getAllFiles(sourceFolder);
        
        for (const filePath of files) {
            const relativePath = relative(sourceFolder, filePath);
            const targetPath = join(outputPath, buildOutputPath, relativePath);
            const targetDir = dirname(targetPath);
            
            // Create target directory if it doesn't exist
            mkdirSync(targetDir, { recursive: true });
            
            // Copy file
            copyFileSync(filePath, targetPath);
            console.log(`📁 Copied data file: ${relativePath}`);
        }
    };

    return {
        name: 'data-folder',
        enforce: 'pre',

        configResolved(config) {
            isBuild = config.command === 'build';
            outputDir = config.build.outDir || 'dist';
        },

        // Handle build mode - copy files to output directory
        generateBundle() {
            if (isBuild) {
                console.log(`📦 Copying data files from ${sourceFolder} to ${buildOutputPath}...`);
                copyFilesToBuild(outputDir);
                console.log('✅ Data files copied successfully');
            }
        },

        // Handle development mode - serve files via middleware
        configureServer(server) {
            if (!existsSync(sourceFolder)) {
                server.config.logger.warn(`[rpgjs] Data folder not found: ${sourceFolder}`);
                return;
            }

            addDevBannerEntry(server.config, {
                label: 'Maps',
                value: `${colors.cyan(sourceFolder)} ${colors.dim('→')} ${colors.cyan(publicPath)}`,
            });

            server.middlewares.use((req: any, res: any, next: any) => {
                if (!req.url?.startsWith(publicPath)) {
                    return next();
                }

                // Remove public path prefix to get relative file path
                const relativePath = req.url.slice(publicPath.length);
                
                // Remove leading slash if present
                const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
                
                // Construct full file path
                const filePath = join(sourceFolder, cleanPath);

                // Security check - ensure file is within source folder
                const cwd = typeof process !== 'undefined' ? process.cwd() : '';
                const resolvedFilePath = join(cwd, filePath);
                const resolvedSourceFolder = join(cwd, sourceFolder);
                
                if (!resolvedFilePath.startsWith(resolvedSourceFolder)) {
                    res.statusCode = 403;
                    res.end('Forbidden');
                    return;
                }

                // Check if file exists and is allowed
                if (!existsSync(filePath) || !isAllowedFile(filePath)) {
                    res.statusCode = 404;
                    res.end('Not Found');
                    return;
                }

                // Check if it's a file (not directory)
                const stat = statSync(filePath);
                if (!stat.isFile()) {
                    res.statusCode = 404;
                    res.end('Not Found');
                    return;
                }

                try {
                    // Read and serve the file
                    const fileContent = readFileSync(filePath);
                    const mimeType = getMimeType(filePath);
                    
                    res.setHeader('Content-Type', mimeType);
                    res.setHeader('Cache-Control', 'no-cache');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.end(fileContent);
                } catch (error) {
                    console.error(`❌ Error serving file ${filePath}:`, error);
                    res.statusCode = 500;
                    res.end('Internal Server Error');
                }
            });
        }
    };
} 