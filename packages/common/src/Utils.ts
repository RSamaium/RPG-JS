import { constructor } from "@rpgjs/types";

export function random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function isBrowser(): boolean {
    return typeof window !== 'undefined'
}

export function isFunction(val: unknown): boolean {
    return {}.toString.call(val) === '[object Function]'
}

export function isClass(func: unknown): boolean {
    return typeof func === 'function';
}

export function isPromise(val: unknown) {
    return isInstanceOf<Promise<unknown>>(val, Promise)
}

export function isArray(val: unknown) {
    return isInstanceOf<Array<unknown>>(val, Array)
}

export function isObject(val: unknown): boolean {
    return typeof val == 'object' && val != null && !isArray(val)
}

export function isString(val: unknown): boolean {
    return typeof val == 'string'
}

export function isInstanceOf<T = any>(val: unknown, _class: any) {
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

export function capitalize(s: unknown): string {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export function camelToKebab(str: string): string {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();
}

export function arrayEquals(a: any[], b: any[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i])
}

export function applyMixins(derivedCtor: constructor<any>, baseCtors: constructor<any>[]) {
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

export function createConstructor<T>(...propNames: any[]): T {
    return class {
        constructor(...propValues) {
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

export function hexaToNumber(hexa: string): {
    value: number,
    alpha: number
} {
    let val = hexa.replace('#', '')
    let alpha = 1
    if (val.length === 3) {
        val = val.split('').map((v) => v + v).join('')
    }
    if (val.length === 8) {
        alpha = parseInt(val.substring(0, 2), 16) / 255
        val = val.substring(2)
    }
    return {
        value: parseInt(val, 16),
        alpha
    }
}

export function extractId(path: string): string | null {
    const id = path.match(/([a-zA-Z0-9-_$!]+)\.[a-z0-9]+$/i)
    if (!id) return null
    return id[1]
}

export function basename(path: string): string {
    return path.substring(path.lastIndexOf('/') + 1)
}

export function fps2ms(fps: number): number {
    return 1000 / fps
}

export function preciseNow(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

export function round(num: number, decimals: number = 100): number {
    return Math.round(num * decimals) / decimals
}

// https://stackoverflow.com/questions/54733539/javascript-implementation-of-lodash-set-method
export function set(obj, path, value, onlyPlainObject = false) {
    if (Object(obj) !== obj) return obj; // When obj is not an object
    // If not yet an array, get the keys from the string-path
    if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || [];
    path.slice(0, -1).reduce((a, c, i) => // Iterate all of them except the last one
        Object(a[c]) === a[c] // Does the key exist and is its value an object?
            // Yes: then follow that path
            ? a[c]
            // No: create the key. Is the next key a potential array-index?
            : a[c] = Math.abs(path[i + 1]) >> 0 === +path[i + 1]
                ? onlyPlainObject ? {} : [] // Yes: assign a new array object
                : {}, // No: assign a new plain object
        obj)[path[path.length - 1]] = value; // Finally assign the value to the last key
    return obj; // Return the top-level object to allow chaining
};

export function elementToPositionAbsolute(element: HTMLElement) {
    element.style.position = 'absolute'
    element.style.top = '0'
    element.style.left = '0'
    element.style.right = '0'
    element.style.bottom = '0'
    element.style.width = '100%'
    element.style.height = '100%'
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
    basename,
    fps2ms,
    preciseNow,
    hexaToNumber,
    set,
    round,
    camelToKebab,
    elementToPositionAbsolute
}