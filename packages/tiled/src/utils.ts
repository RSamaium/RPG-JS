export function isTiledFormat(val: any): boolean {
    return typeof val == 'object' && val.version && val.orientation
}