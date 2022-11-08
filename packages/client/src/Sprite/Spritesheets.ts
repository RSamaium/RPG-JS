import { RpgClientEngine } from '..'
import { _initResource } from '../Resources'

export const spritesheets: Map<string, any> = new Map()

export function _initSpritesheet(_spritesheets, engine: RpgClientEngine) {
    return _initResource(spritesheets, _spritesheets, 'image', engine)
}