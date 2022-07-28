export function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function isBrowser() {
    return typeof window !== 'undefined'
}

export function isFunction(val) {
    return {}.toString.call(val) === '[object Function]'
}

export function isClass(func) {
    return typeof func === 'function'
        && /^class\s/.test(Function.prototype.toString.call(func));
}

export function isPromise(val) {
    return isInstanceOf(val, Promise)
}

export function isArray(val) {
    return isInstanceOf(val, Array)
}

export function isObject(val) {
    return typeof val == 'object' && val != null && !isArray(val)
}

export function isString(val) {
    return typeof val == 'string'
}

export function isInstanceOf(val, _class) {
    return val instanceof _class
}

export function arrayUniq(array: any[]): any[] {
    return [...new Set(array)]
}

export function arrayFlat(array: any[]): any[] {
    return array.reduce((acc, val) => acc.concat(val), [])
}

export function intersection([start1, end1]: [number, number], [start2, end2]: [number, number]): boolean {
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

export function generateUID(): string {
    let firstPart: any = (Math.random() * 46656) | 0
    let secondPart: any = (Math.random() * 46656) | 0
    firstPart = ("000" + firstPart.toString(36)).slice(-3)
    secondPart = ("000" + secondPart.toString(36)).slice(-3)
    return firstPart + secondPart
}

export function createConstructor<T>(...propNames): T {
    return class {
        constructor(...propValues){
            propNames.forEach((name, idx) => {
                this[name] = propValues[idx]
            })
        }
    } as unknown as T
}

export function sharedArrayBuffer() {
    let buffer
    if (typeof SharedArrayBuffer != 'undefined') {
        buffer = SharedArrayBuffer
    }
    else {
        buffer = ArrayBuffer
    }
    return buffer
}

export function toRadians(angle: number) {
    return angle * (Math.PI / 180)
}

export function extractId(path: string): string | null {
    const id = path.match(/([a-zA-Z0-9-_$!]+)\.[a-z]+$/i)
    if (!id) return null
    return id[1]
}

export function basename(path: string): string {
    return path.substring(path.lastIndexOf('/') + 1)
}

export default {
    random,
    isBrowser,
    isPromise,
    isArray,
    isObject,
    isString,
    isFunction,
    isClass,
    isInstanceOf,
    arrayUniq,
    arrayFlat,
    arrayEquals,
    intersection,
    applyMixins,
    capitalize,
    sharedArrayBuffer,
    generateUID,
    createConstructor,
    toRadians,
    extractId,
    basename
}