export function merge(options, type, _static = {}) {
    return (target) => {
        target._type = type
        for (let key in _static) {
            target[key] = options[key]
        }
        for (let key in options) {
            target.prototype[key] = options[key]
        }
    }
}

export interface RpgClassDatabase<T> {
    new ()
}
