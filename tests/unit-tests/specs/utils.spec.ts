import { Utils } from '@rpgjs/common'
import { test, expect, describe } from 'vitest'


describe('extractId()', () => {
    test('Image', () => {
        const id = Utils.extractId('foo/bar/baz.png')
        expect(id).toBe('baz')
    })

    test('Map', () => {
        const id = Utils.extractId('foo/bar/baz.tmx')
        expect(id).toBe('baz')
    })

    test('Sound', () => {
        const id = Utils.extractId('foo/bar/baz.mp3')
        expect(id).toBe('baz')
    })
})

