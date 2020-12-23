interface MapOptions {
    id: string,
    file: string,
    name?: string,
    events?: { event: any, x: number, y: number }[] | any[],
    sounds?: string[]
}

export function MapData(options: MapOptions) {
    return (target) => {
        target.file = options.file
        target.id = options.id
        target.prototype.name = options.name
        target.prototype.file = options.file
        target.prototype.id = options.id
        target.prototype.sounds = options.sounds
        target.prototype._events = options.events
    }
}