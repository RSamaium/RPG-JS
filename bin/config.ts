/**
 * Package dependency configuration helper
 * 
 * This module provides a centralized way to manage package dependencies
 * and build configurations, reducing redundancy and improving maintainability.
 */

/**
 * Creates a dependency path for a package
 * 
 * @param basePath - The base directory (packages or sample)
 * @param packageName - The name of the package
 * @param fileName - The output file name (default: 'index.d.ts')
 * @returns Full path to the dependency file
 * @example
 * ```typescript
 * const dep = createDependency('packages', 'common'); // 'packages/common/dist/index.d.ts'
 * ```
 */
const createDependency = (basePath: string, packageName: string, fileName: string = 'index.d.ts'): string => {
  return `${basePath}/${packageName}/dist/${fileName}`;
};

/**
 * Creates multiple dependencies for a base path
 * 
 * @param basePath - The base directory
 * @param packageNames - Array of package names
 * @returns Array of dependency paths
 * @example
 * ```typescript
 * const deps = createDependencies('packages', ['common', 'tiled']);
 * ```
 */
const createDependencies = (basePath: string, packageNames: string[]): string[] => {
  return packageNames.map(name => createDependency(basePath, name));
};

/**
 * Package build configuration generator
 * 
 * This function generates the complete package build configuration with
 * proper dependency management and eliminates redundancy. It ensures
 * packages are built in the correct order based on their dependencies.
 * 
 * @param type - Build type ('build' for production, 'dev' for development)
 * @returns Array of package configurations with dependencies
 * @example
 * ```typescript
 * const buildConfigs = packages('build');
 * const devConfigs = packages('dev');
 * ```
 */
export const packages = (type: "build" | "dev") => {
  const buildScript = type === "build" ? "build" : "dev";
  const packagesPath = "packages";
  const samplePath = "sample";

  return [
    // Core packages (no dependencies)
    {
      name: "vite", 
      buildScript
    },
    {
      name: "common",
      buildScript
    },
    
    // Packages depending on core packages
    {
      name: "client",
      buildScript,
      dependencies: createDependencies(packagesPath, ['common']),
    },
    {
      name: "server",
      buildScript,
      dependencies: createDependencies(packagesPath, ['common']),
    },

    {
      name: "vue",
      buildScript,
      dependencies: createDependencies(packagesPath, ['client']),
    },
    
    // Packages depending on client/server
    {
      name: "tiledmap",
      buildScript,
      dependencies: createDependencies(packagesPath, ['server', 'client', 'vite']),
    },
    
    // Sample package (depends on all others)
    {
      name: samplePath,
      buildScript,
      dependencies: createDependencies(packagesPath, ['client', 'server', 'vite', 'tiledmap']),
    },
  ];
};
