export function Spritesheet(options) {
    return (target) => {
        target.images = options.images
        target.id = options.id
        for (let key in options) {
            target.prototype[key] = options[key]
        }
    }
}