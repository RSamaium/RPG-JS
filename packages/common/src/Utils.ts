export function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function isBrowser() {
    return typeof window !== 'undefined'
}

export function isPromise(obj) {
    return obj instanceof Promise
}

export function isArray(val) {
    return val instanceof Array
}

export function isObject(val) {
    return typeof val == 'object'
}

export default {
    random,
    isBrowser,
    isPromise,
    isArray,
    isObject
}