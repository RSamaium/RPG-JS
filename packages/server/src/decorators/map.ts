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
        target.prototype.name = options.name
        target.prototype.file = options.file
        target.prototype.id = options.id
        target.prototype._events = options.events
    }
}