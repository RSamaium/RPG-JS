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
    return typeof val == 'object'
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

export function createConstructor(...propNames){
    return class {
        constructor(...propValues){
            propNames.forEach((name, idx) => {
                this[name] = propValues[idx]
            })
        }
    }
}

export function perlin() {
    let perlin = {
        rand_vect: function(){
            let theta = Math.random() * 2 * Math.PI;
            return {x: Math.cos(theta), y: Math.sin(theta)};
        },
        dot_prod_grid: function(x, y, vx, vy){
            let g_vect;
            let d_vect = {x: x - vx, y: y - vy};
            if (this.gradients[`${vx},${vy}`]){
                g_vect = this.gradients[`${vx},${vy}`];
            } else {
                g_vect = this.rand_vect();
                this.gradients[`${vx},${vy}`] = g_vect;
            }
            return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
        },
        smootherstep: function(x){
            return 6*x**5 - 15*x**4 + 10*x**3;
        },
        interp: function(x, a, b){
            return a + this.smootherstep(x) * (b-a);
        },
        seed: function(){
            this.gradients = {};
            this.memory = {};
        },
        get: function(x, y) {
            if (this.memory.hasOwnProperty(`${x},${y}`))
                return this.memory[`${x},${y}`];
            let xf = Math.floor(x);
            let yf = Math.floor(y);
            //interpolate
            let tl = this.dot_prod_grid(x, y, xf,   yf);
            let tr = this.dot_prod_grid(x, y, xf+1, yf);
            let bl = this.dot_prod_grid(x, y, xf,   yf+1);
            let br = this.dot_prod_grid(x, y, xf+1, yf+1);
            let xt = this.interp(x-xf, tl, tr);
            let xb = this.interp(x-xf, bl, br);
            let v = this.interp(y-yf, xt, xb);
            this.memory[`${x},${y}`] = v;
            return v;
        }
    }
    perlin.seed()
    return perlin
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
    perlin,
    generateUID,
    createConstructor
}