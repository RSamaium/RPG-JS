export function EventData(options) {
    return (target) => {
        target.syncAll = options.syncAll
        target.prototype.name = options.name
    }
}