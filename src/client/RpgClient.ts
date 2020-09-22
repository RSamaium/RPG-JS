export function RpgClient(options) {
    return (target) => {
        target.prototype._options = {}
        for (let key in options) {
            target.prototype._options[key] = options[key]
        }
    }
}