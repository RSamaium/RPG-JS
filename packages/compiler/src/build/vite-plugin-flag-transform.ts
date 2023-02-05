export function flagTransform(side) {
    return {
        name: 'transform-flag',

        async resolveId(source, importer, options) {
            const flags = ['client!', 'server!']
            for (const flag of flags) {
                if (source.startsWith(flag)) {
                    const path = source.replace(flag, '')
                    const resolution = await this.resolve(path, importer, {
                        skipSelf: true,
                        ...options
                    });
                    return {
                        ...resolution,
                        id: resolution.id + `?${flag.replace('!', '')}`
                    }
                }
            }
        },

        async transform(source, id) {
            const ignore = side == 'client' ? 'server' : 'client'
            if (id.endsWith(ignore)) {
                return {
                    code: `export default null`,
                    map: null
                }
            }
        }
    }
}