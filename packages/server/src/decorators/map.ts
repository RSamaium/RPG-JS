interface MapOptions {
    id: string,
    file: string,
    name?: string,
    events?: any[]
}

export function MapData(options: MapOptions) {
    return (target) => {
        target.file = options.file
        target.id = options.id
        for (let key in options) {
            target.prototype[key] = options[key]
        }
    }
}