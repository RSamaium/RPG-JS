import { execa } from 'execa';
import waitOn from 'wait-on';
import process from 'process';

export interface PackageConfig {
    name: string;
    buildScript: string;
    outputPath?: string;
    dependencies?: string[];
}

const createStdio = (packageName: string) => ({
    prefix: `📦 ${packageName} |`,
    stdio: 'inherit' as const,
    preferLocal: true,
    reject: false
});

export async function buildPackage(config: PackageConfig) {
    try {
        // Wait for dependencies if specified
        if (config.dependencies && config.dependencies.length > 0) {
            console.log(`⏳ Waiting for ${config.name} dependencies...`);
            await waitOn({
                resources: config.dependencies,
                timeout: 60000,
                interval: 1000
            }, undefined);
        }

        console.log(`🚀 Building ${config.name}...`);
        const result = await execa('npm', ['run', config.buildScript], {
            cwd: `packages/${config.name}`,
            ...createStdio(config.name)
        });

        console.log(`✅ ${config.name} build completed`);
        return result;
    } catch (err) {
        console.error(`❌ ${config.name} build failed:`, err);
        throw err;
    }
}

export async function buildSequentially(packages: PackageConfig[]) {
    try {
        for (const pkg of packages) {
            buildPackage(pkg);
        }
        console.log('✅ All builds completed successfully');
    } catch (error) {
        console.error('❌ Build error:', error);
        process.exit(1);
    }
}