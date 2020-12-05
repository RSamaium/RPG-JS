export function Input(options?): any {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        let value;
        const getter = function() {
          return value;
        };
        const setter = function (newVal) {
          if (!this.$inputs) this.$inputs = {} 
          this.$inputs[key] = options || Object
          value = newVal
        }
        Object.defineProperty(target, key, {
          get: getter,
          set: setter,
          enumerable: true,
          configurable: true
        })
    }
}