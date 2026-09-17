#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

interface PackageInfo {
  name: string;
  version: string;
  path: string;
}

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Cache all package versions from the packages directory
 * 
 * This function scans all subdirectories in the packages folder,
 * reads their package.json files, and creates a cache mapping
 * package names to their versions for later reference.
 * 
 * @param packagesDir - The path to the packages directory
 * @returns A Map containing package names as keys and their info as values
 * 
 * @example
 * ```typescript
 * const cache = await cachePackageVersions('./packages');
 * console.log(cache.get('@rpgjs/client')); // { name: '@rpgjs/client', version: '5.0.0-alpha.2', path: '...' }
 * ```
 */
async function cachePackageVersions(packagesDir: string): Promise<Map<string, PackageInfo>> {
  const cache = new Map<string, PackageInfo>();
  
  try {
    const packageDirs = await readdir(packagesDir, { withFileTypes: true });
    
    for (const dir of packageDirs) {
      if (!dir.isDirectory()) continue;
      
      const packagePath = join(packagesDir, dir.name);
      const packageJsonPath = join(packagePath, 'package.json');
      
      try {
        const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
        const packageJson: PackageJson = JSON.parse(packageJsonContent);
        
        if (packageJson.name && packageJson.version) {
          cache.set(packageJson.name, {
            name: packageJson.name,
            version: packageJson.version,
            path: packagePath
          });
          
          console.log(`✓ Cached ${packageJson.name}@${packageJson.version}`);
        }
      } catch (error) {
        console.warn(`⚠ Could not read package.json for ${dir.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error reading packages directory:', error);
    throw error;
  }
  
  return cache;
}

/**
 * Replace workspace:* references with actual versions in dependencies
 * 
 * This function takes a dependencies object and replaces any 'workspace:*'
 * references with the actual version from the package cache. It handles
 * all types of dependencies (dependencies, devDependencies, etc.).
 * 
 * @param dependencies - The dependencies object to process
 * @param packageCache - The cache containing package versions
 * @returns The updated dependencies object with resolved versions
 * 
 * @example
 * ```typescript
 * const deps = { '@rpgjs/common': 'workspace:*' };
 * const resolved = replaceWorkspaceReferences(deps, cache);
 * console.log(resolved); // { '@rpgjs/common': '5.0.0-alpha.2' }
 * ```
 */
function replaceWorkspaceReferences(
  dependencies: Record<string, string> | undefined,
  packageCache: Map<string, PackageInfo>
): Record<string, string> | undefined {
  if (!dependencies) return dependencies;
  
  const updated = { ...dependencies };
  let hasChanges = false;
  
  for (const [packageName, version] of Object.entries(updated)) {
    if (version === 'workspace:*') {
      const cachedPackage = packageCache.get(packageName);
      if (cachedPackage) {
        updated[packageName] = cachedPackage.version;
        hasChanges = true;
        console.log(`  → Replaced ${packageName}: workspace:* → ${cachedPackage.version}`);
      } else {
        console.warn(`  ⚠ No cached version found for ${packageName}`);
      }
    }
  }
  
  return hasChanges ? updated : dependencies;
}

/**
 * Process a single package.json file to replace workspace references
 * 
 * This function reads a package.json file, replaces all workspace:*
 * references in all dependency types with actual versions from the cache,
 * and writes the updated file back to disk.
 * 
 * @param packageJsonPath - Path to the package.json file
 * @param packageCache - Cache containing package versions
 * @returns Promise that resolves when the file is processed
 * 
 * @example
 * ```typescript
 * await processPackageJson('./packages/client/package.json', cache);
 * ```
 */
async function processPackageJson(
  packageJsonPath: string,
  packageCache: Map<string, PackageInfo>
): Promise<void> {
  try {
    const content = await readFile(packageJsonPath, 'utf-8');
    const packageJson: PackageJson = JSON.parse(content);
    
    console.log(`\n📦 Processing ${packageJson.name || 'unknown package'}`);
    
    let hasChanges = false;
    
    // Process all types of dependencies
    const dependencyTypes = [
      'dependencies',
      'devDependencies', 
      'peerDependencies',
      'optionalDependencies'
    ] as const;
    
    for (const depType of dependencyTypes) {
      const originalDeps = packageJson[depType];
      const updatedDeps = replaceWorkspaceReferences(originalDeps, packageCache);
      
      if (updatedDeps !== originalDeps) {
        packageJson[depType] = updatedDeps;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      // Write back with proper formatting
      const updatedContent = JSON.stringify(packageJson, null, 2) + '\n';
      await writeFile(packageJsonPath, updatedContent, 'utf-8');
      console.log(`✅ Updated ${packageJsonPath}`);
    } else {
      console.log(`ℹ No workspace references found in ${packageJson.name}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${packageJsonPath}:`, error);
    throw error;
  }
}

/**
 * Fail when a package manifest still contains a workspace protocol.
 * Published npm packages cannot resolve workspace protocols outside this monorepo.
 */
async function assertNoWorkspaceReferences(packageCache: Map<string, PackageInfo>): Promise<void> {
  const unresolved: string[] = [];
  const dependencyTypes = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies'
  ] as const;

  for (const packageInfo of packageCache.values()) {
    const packageJsonPath = join(packageInfo.path, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as PackageJson;

    for (const dependencyType of dependencyTypes) {
      for (const [dependencyName, version] of Object.entries(packageJson[dependencyType] ?? {})) {
        if (version.startsWith('workspace:')) {
          unresolved.push(`${packageJson.name}:${dependencyType}.${dependencyName}=${version}`);
        }
      }
    }
  }

  if (unresolved.length > 0) {
    throw new Error(`Unresolved workspace protocols:\n${unresolved.join('\n')}`);
  }
}

/**
 * Main deployment script function
 * 
 * This is the main entry point that orchestrates the entire process:
 * 1. Caches all package versions from the packages directory
 * 2. Processes each package.json to replace workspace:* references
 * 3. Provides comprehensive logging and error handling
 * 
 * The script is designed to be run from the project root and will
 * automatically discover all packages in the packages/ directory.
 * 
 * @example
 * ```bash
 * # Run from project root
 * npx tsx bin/deploy.ts
 * ```
 */
async function main(projectRoot = resolve(process.cwd())): Promise<void> {
  console.log('🚀 Starting deployment script...\n');
  const packagesDir = join(projectRoot, 'packages');
  
  try {
    // Step 1: Cache all package versions
    console.log('📋 Step 1: Caching package versions...');
    const packageCache = await cachePackageVersions(packagesDir);
    
    if (packageCache.size === 0) {
      console.warn('⚠ No packages found in packages directory');
      return;
    }
    
    console.log(`\n✅ Cached ${packageCache.size} packages\n`);
    
    // Step 2: Process each package.json
    console.log('🔄 Step 2: Processing package.json files...');
    
    for (const packageInfo of packageCache.values()) {
      const packageJsonPath = join(packageInfo.path, 'package.json');
      await processPackageJson(packageJsonPath, packageCache);
    }

    console.log('\n🔎 Step 3: Validating publish manifests...');
    await assertNoWorkspaceReferences(packageCache);
    console.log('✅ Publish manifests contain no workspace protocols');
    
    console.log('\n🎉 Deployment script completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Processed ${packageCache.size} packages`);
    console.log('   • All workspace:* references have been resolved');
    
  } catch (error) {
    console.error('\n❌ Deployment script failed:', error);
    process.exit(1);
  }
}

// Execute the script if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export {
  main,
  cachePackageVersions,
  replaceWorkspaceReferences,
  processPackageJson,
  assertNoWorkspaceReferences
};
