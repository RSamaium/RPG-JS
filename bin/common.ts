import { execa } from 'execa';
import waitOn from 'wait-on';
import process from 'process';
import { promises as fs } from 'fs';
import path from 'path';

export interface PackageConfig {
    name: string;
    buildScript: string;
    outputPath?: string;
    dependencies?: string[];
}

/**
 * Creates stdio configuration for package build process
 * 
 * @param packageName - The name of the package being built
 * @returns Configuration object for stdio handling
 * @example
 * ```typescript
 * const stdio = createStdio('client');
 * ```
 */
const createStdio = (packageName: string) => ({
    prefix: `📦 ${packageName} |`,
    stdio: 'inherit' as const,
    preferLocal: true,
    reject: false
});

/**
 * Cleans the dist directory for a given package
 * 
 * This function removes the dist directory to ensure a clean build.
 * It handles cases where the directory doesn't exist gracefully.
 * 
 * @param packageName - The name of the package to clean
 * @param basePath - The base path where packages are located (default: 'packages')
 * @example
 * ```typescript
 * await cleanDistDirectory('client');
 * await cleanDistDirectory('sample', 'sample');
 * ```
 */
export async function cleanDistDirectory(packageName: string, basePath: string = 'packages') {
    const distPath = path.join(basePath, packageName, 'dist');
    
    try {
        await fs.access(distPath);
        await fs.rm(distPath, { recursive: true, force: true });
        console.log(`🧹 Cleaned dist directory for ${packageName}`);
    } catch (error) {
        // Directory doesn't exist, which is fine
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.warn(`⚠️  Warning: Could not clean dist directory for ${packageName}:`, error);
        }
    }
}

/**
 * Cleans all dist directories for multiple packages
 * 
 * This function provides a way to clean all dist directories at once,
 * ensuring a completely clean build environment. It's useful for
 * full rebuilds and CI/CD pipelines.
 * 
 * @param packages - Array of package configurations
 * @returns Promise that resolves when all directories are cleaned
 * @example
 * ```typescript
 * await cleanAllDistDirectories([
 *   { name: 'common', buildScript: 'build' },
 *   { name: 'client', buildScript: 'build' }
 * ]);
 * ```
 */
export async function cleanAllDistDirectories(packages: PackageConfig[]) {
    console.log('🧹 Cleaning all dist directories...');
    
    const cleanPromises = packages.map(async (pkg) => {
        const basePath = pkg.name === 'sample' ? '.' : 'packages';
        return cleanDistDirectory(pkg.name, basePath);
    });
    
    await Promise.all(cleanPromises);
    console.log('✨ All dist directories cleaned');
}

/**
 * Builds a single package with dependency management and error handling
 * 
 * This function handles the complete build process for a package:
 * - Cleans the dist directory
 * - Waits for dependencies if specified
 * - Executes the build script
 * - Provides comprehensive error handling
 * 
 * @param config - Package configuration object
 * @param basePath - Base path for packages (default: 'packages')
 * @returns Promise that resolves when build is complete
 * @example
 * ```typescript
 * await buildPackage({
 *   name: 'client',
 *   buildScript: 'build',
 *   dependencies: ['packages/common/dist/index.d.ts']
 * });
 * ```
 */
export async function buildPackage(config: PackageConfig, basePath: string = 'packages') {
    const packagePath = path.join(basePath, config.name);
    
    try {
        // Verify package directory exists
        await fs.access(packagePath);
    } catch (error) {
        throw new Error(`Package directory not found: ${packagePath}`);
    }

    try {
        // Wait for dependencies if specified
        if (config.dependencies && config.dependencies.length > 0) {
            console.log(`⏳ Waiting for ${config.name} dependencies...`);
            await waitOn({
                resources: config.dependencies,
                timeout: 120000, // Increased timeout for safety
                interval: 1000,
                verbose: false
            });
        }

        console.log(`🚀 Building ${config.name}...`);
        const result = await execa('npm', ['run', config.buildScript], {
            cwd: packagePath,
            ...createStdio(config.name)
        });

        if (result.exitCode !== 0) {
            throw new Error(`${config.name} build exited with code ${result.exitCode}`);
        }

        // Verify build output exists if outputPath is specified
        if (config.outputPath) {
            const outputFullPath = path.join(packagePath, config.outputPath);
            try {
                await fs.access(outputFullPath);
            } catch (error) {
                throw new Error(`Build output not found at: ${outputFullPath}`);
            }
        }

        console.log(`✅ ${config.name} build completed successfully`);
        return result;
    } catch (err) {
        console.error(`❌ ${config.name} build failed:`, err);
        throw err;
    }
}

/**
 * Builds packages sequentially with comprehensive error handling
 * 
 * This function processes packages one by one, ensuring proper dependency
 * order and providing detailed error reporting. It includes safety measures
 * to prevent partial builds and ensure clean state.
 * 
 * @param packages - Array of package configurations to build
 * @returns Promise that resolves when all packages are built
 * @example
 * ```typescript
 * await buildSequentially([
 *   { name: 'common', buildScript: 'build' },
 *   { name: 'client', buildScript: 'build', dependencies: ['packages/common/dist/index.d.ts'] }
 * ]);
 * ```
 */
export async function buildSequentially(packages: PackageConfig[]) {
    if (!packages || packages.length === 0) {
        console.warn('⚠️  No packages to build');
        return;
    }

    console.log(`🏗️  Starting build process for ${packages.length} packages...`);
    
    try {
        // Clean all dist directories first for a fresh start
        await cleanAllDistDirectories(packages);
        
        for (let i = 0; i < packages.length; i++) {
            const pkg = packages[i];
            console.log(`\n📋 Building package ${i + 1}/${packages.length}: ${pkg.name}`);
            
            // Determine base path based on package name
            const basePath = pkg.name === 'sample' ? '.' : 'packages';
            
            await buildPackage(pkg, basePath);
        }
        
        console.log('\n🎉 All packages built successfully!');
    } catch (error) {
        console.error('\n❌ Build process failed:', error);
        console.error('💡 Tip: Check the error above and ensure all dependencies are properly configured');
        process.exit(1);
    }
}

/**
 * Builds packages in parallel for watch mode
 * 
 * This function is specifically designed for development mode where packages
 * need to run in watch mode simultaneously. Unlike sequential builds, this
 * function starts all packages at once and doesn't wait for them to complete,
 * as watch mode processes run indefinitely.
 * 
 * @param packages - Array of package configurations to build in parallel
 * @returns Promise that resolves when all watch processes are started
 * @example
 * ```typescript
 * await buildInParallel([
 *   { name: 'common', buildScript: 'dev' },
 *   { name: 'client', buildScript: 'dev', dependencies: ['packages/common/dist/index.d.ts'] }
 * ]);
 * ```
 */
export async function buildInParallel(packages: PackageConfig[]) {
    if (!packages || packages.length === 0) {
        console.warn('⚠️  No packages to build');
        return;
    }

    console.log(`🏗️  Starting parallel build process for ${packages.length} packages...`);
    
    try {
        // Clean all dist directories first for a fresh start
        await cleanAllDistDirectories(packages);
        
        // Start all packages in parallel
        const buildPromises = packages.map(async (pkg) => {
            const basePath = pkg.name === 'sample' ? '.' : 'packages';
            const packagePath = path.join(basePath, pkg.name);
            
            try {
                // Verify package directory exists
                await fs.access(packagePath);
            } catch (error) {
                throw new Error(`Package directory not found: ${packagePath}`);
            }

            // Wait for dependencies if specified
            if (pkg.dependencies && pkg.dependencies.length > 0) {
                console.log(`⏳ Waiting for ${pkg.name} dependencies...`);
                await waitOn({
                    resources: pkg.dependencies,
                    timeout: 120000,
                    interval: 1000,
                    verbose: false
                });
            }

            console.log(`🚀 Starting ${pkg.name} in watch mode...`);
            
            // Start the watch process (don't await it as it runs indefinitely)
            const childProcess = execa('npm', ['run', pkg.buildScript], {
                cwd: packagePath,
                ...createStdio(pkg.name)
            });

            // Handle process events
            childProcess.catch(err => {
                console.error(`❌ ${pkg.name} watch process failed:`, err);
            });

            return childProcess;
        });

        // Start all processes
        const processes = await Promise.all(buildPromises);
        
        console.log('\n🎉 All packages started in watch mode!');
        console.log('💡 Press Ctrl+C to stop all watch processes');
        
        // Handle graceful shutdown
        const handleShutdown = () => {
            console.log('\n🛑 Shutting down all watch processes...');
            processes.forEach(process => {
                if (!process.killed) {
                    process.kill('SIGTERM');
                }
            });
            process.exit(0);
        };

        process.on('SIGINT', handleShutdown);
        process.on('SIGTERM', handleShutdown);
        
        // Wait for all processes to complete (they won't in watch mode)
        await Promise.all(processes);
        
    } catch (error) {
        console.error('\n❌ Parallel build process failed:', error);
        console.error('💡 Tip: Check the error above and ensure all dependencies are properly configured');
        process.exit(1);
    }
}
