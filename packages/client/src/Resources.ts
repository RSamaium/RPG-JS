export function _initResource(memory: Map<string, any>, _resources, prop: string) {
    for (let resource of _resources) {
        const pluralProp = prop + 's'
        if (resource[pluralProp]) {
            for (let key in resource[pluralProp]) {
                const instance = new resource()
                instance[prop] = resource[pluralProp][key]
                memory.set(key, instance)
            }
        }
        else {
            const instance = new resource()
            instance[prop] = instance[prop]
            memory.set(resource.id, instance)
        }
    }
}