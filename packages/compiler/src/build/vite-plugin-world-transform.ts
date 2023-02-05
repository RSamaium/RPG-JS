export function worldTransformPlugin() {
    return {
        name: 'transform-world',
        transform(source, id) {
            if (id.endsWith('.world')) {
                return {
                    code: `export default ${source}`,
                    map: null
                }
            }
        }
    }
}