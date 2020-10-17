export function EventData(options) {
    return (target) => {
        target.syncAll = options.syncAll
        target.width = options.width
        target.height = options.height
        target.hitbox = options.hitbox
        target.prototype._name = options.name
    }
}