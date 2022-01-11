import { _initResource } from '../Resources'

export const spritesheets = new Map()

export function _initSpritesheet(_spritesheets, engine) {
    return _initResource(spritesheets, _spritesheets, 'image', engine)
}