export const spritesheets = new Map()

export function _initSpritesheet(_spritesheets) {
    for (let spritesheet of _spritesheets) {
        if (spritesheet.images) {
            for (let key in spritesheet.images) {
                const instance = new spritesheet()
                instance.image = spritesheet.images[key].default
                spritesheets.set(key, instance)
            }
        }
        else {
            const instance = new spritesheet()
            instance.image = instance.image.default
            spritesheets.set(spritesheet.id, instance)
        }
    }
}


