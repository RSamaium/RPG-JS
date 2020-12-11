export function Schema(schema): any {
    return function (target: any) {
        target.prototype.$schema = schema
    }
}