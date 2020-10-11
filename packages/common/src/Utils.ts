export function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function isBrowser() {
    return typeof window !== 'undefined'
}

export function isPromise(val) {
    return isInstanceOf(val, Promise)
}

export function isArray(val) {
    return isInstanceOf(val, Array)
}

export function isObject(val) {
    return typeof val == 'object'
}

export function isString(val) {
    return typeof val == 'string'
}

export function isInstanceOf(val, _class) {
    return val instanceof _class
}

export function arrayUniq(array) {
    return [...new Set(array)]
}

export default {
    random,
    isBrowser,
    isPromise,
    isArray,
    isObject,
    isString,
    isInstanceOf
}