export const packages = (type: 'build' | 'dev') => {
    const buildScript = type === 'build' ? 'build' : 'watch';
    const basePath = 'packages';
    return [
        {
            name: 'compiler',
            buildScript
        },
        {
            name: 'types',
            buildScript,
            dependencies: [`${basePath}/compiler/lib/index.js`]
        },
        {
            name: 'tiled',
            buildScript,
            dependencies: [`${basePath}/types/lib/index.d.ts`]
        },
        {
            name: 'common',
            buildScript,
            dependencies: [`${basePath}/tiled/lib/index.d.ts`]
        },
        {
            name: 'client',
            buildScript,
            dependencies: [`${basePath}/common/lib/index.d.ts`]
        },
        {
            name: 'database',
            buildScript,
            dependencies: [`${basePath}/client/lib/index.d.ts`]
        },
        {
            name: 'server',
            buildScript,
            dependencies: [`${basePath}/database/lib/index.d.ts`]
        },
        {
            name: 'testing',
            buildScript,
            dependencies: [`${basePath}/server/lib/index.d.ts`]
        }
    ];
    
}