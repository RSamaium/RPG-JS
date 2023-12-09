import { _beforeEach } from './beforeEach'
import { RpgModule, RpgClient, RpgSceneMap, inject, RpgRenderer } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect, describe, vi, afterAll } from 'vitest'

beforeEach(() => {
    clear()
})

afterAll(() => {
    clear()
})

describe('Hooks called', () => {
    test('onAfterLoading', async () => {
        const onAfterLoading = vi.fn()

        @RpgModule<RpgClient>({
            scenes: {
                map: {
                    onAfterLoading
                }
            }
        })
        class RpgClientModule { }

        await _beforeEach([{
            client: RpgClientModule
        }])

        expect(onAfterLoading).toHaveBeenCalled()
        expect(onAfterLoading.mock.calls[0][0]).toBeInstanceOf(RpgSceneMap)

    })
})

// TODO
test('Scene Click', async () => {
    const onClick = vi.fn()

    @RpgModule<RpgClient>({
        scenes: {
            map: {
                onAfterLoading(scene) {
                    expect(scene).toBeInstanceOf(RpgSceneMap)
                }
            }
        }
    })
    class RpgClientModule { }

    const { client } = await _beforeEach([{
        client: RpgClientModule
    }])

    const renderer = inject(RpgRenderer)
    renderer.propagateEvent(new MouseEvent('click', {
        clientX: 100,
        clientY: 100
    }))
})