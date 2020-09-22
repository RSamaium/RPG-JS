const merge = function(options, type, _static = {}) {
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

export function Item(options) {
    return merge(options, 'item', {
        price: options.price
    })
}

export function State(options) {
    return merge(options, 'state')
}

export function Actor(options) {
    return merge(options, 'armor')
}

export function Class(options) {
    return merge(options, 'class')
}

export function Skill(options) {
    return merge(options, 'skill')
}

export function Weapon(options) {
    return merge(options, 'weapon')
}

export function Armor(options) {
    return merge(options, 'armor')
}