export function RpgServer(options) {
    return (target) => {
        target._options = {}
        for (let key in options) {
            target._options[key] = options[key]
        }
    }
}