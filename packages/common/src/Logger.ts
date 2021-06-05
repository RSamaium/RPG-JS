export function log(message) {
    return new Error(`[RPGJS] - ${message}`)
}

export function warning(...message) {
    console.warn('[RPGJS Warning]', ...message)
}