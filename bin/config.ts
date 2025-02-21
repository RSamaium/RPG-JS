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
            dependencies: [`${basePath}/types/lib/index.js`]
        },
        {
            name: 'common',
            buildScript,
            dependencies: [`${basePath}/tiled/lib/index.js`]
        },
        {
            name: 'client',
            buildScript,
            dependencies: [`${basePath}/common/lib/index.js`]
        },
        {
            name: 'database',
            buildScript,
            dependencies: [`${basePath}/client/lib/index.js`]
        },
        {
            name: 'server',
            buildScript,
            dependencies: [`${basePath}/database/lib/index.js`]
        },
        {
            name: 'testing',
            buildScript,
            dependencies: [`${basePath}/server/lib/index.js`]
        }
    ];
    
}