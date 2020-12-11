export function Input(options?): any {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        let pKey = `_${key}`

        let init = function (isGet: boolean) {
            return function (newVal?) {
                Object.defineProperty(this, pKey, { enumerable: false, configurable: true, writable: true});
                Object.defineProperty(this, key, {
                    get: () => {
                        return this[pKey];
                    },
                    set: (val) => {
                        this[pKey] = val;
                    },
                    enumerable: true,
                    configurable: true
                })

                if (isGet) {
                    return this[key]
                } else {
                  if (!this.$inputs) this.$inputs = {} 
                  this.$inputs[key] = options || Object
                  this[key] = newVal
                }
            }
        }

        return Object.defineProperty(target, key, {
          get: init(true),
          set: init(false),
          enumerable: true,
          configurable: true
      })
    }
}