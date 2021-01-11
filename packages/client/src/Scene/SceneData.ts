export interface SceneDataOptions {
    inputs?: {

    }
}

export function SceneData(options) {
    return (target) => {
        for (let key in options) {
            target.prototype[key] = options[key]
        }
    }
}