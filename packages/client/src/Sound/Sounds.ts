import { _initResource } from '../Resources'

export const sounds = new Map()

export function _initSound(_sounds) {
    return _initResource(sounds, _sounds, 'sound')
}