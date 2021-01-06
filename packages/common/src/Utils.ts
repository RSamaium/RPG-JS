export function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function isBrowser() {
    return typeof window !== 'undefined'
}

export function isFunction(val) {
    return {}.toString.call(val) === '[object Function]'
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

export function arrayFlat(array) {
    return array.reduce((acc, val) => acc.concat(val), [])
}

export function intersection([start1, end1], [start2, end2]): boolean {
    return (start1 >= start2 && start1 <= end2) || (start2 >= start1 && start2 < end1)
}

export function capitalize(s) {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export function arrayEquals(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach((baseCtor) => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
        const baseCtorName = Object.getOwnPropertyDescriptor(baseCtor.prototype, name)
        if (!baseCtorName) {
            return
        }
            Object.defineProperty(derivedCtor.prototype, name, baseCtorName)
        })
    })
}

export default {
    random,
    isBrowser,
    isPromise,
    isArray,
    isObject,
    isString,
    isFunction,
    isInstanceOf,
    arrayUniq,
    arrayFlat,
    arrayEquals,
    intersection,
    applyMixins,
    capitalize
}