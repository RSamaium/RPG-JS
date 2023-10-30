import {_beforeEach} from './beforeEach'
import { RpgPlayer } from '@rpgjs/server'
import { RpgClientEngine, RpgModule, RpgClient, RpgSceneMap } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect, describe, vi, afterAll } from 'vitest'

beforeEach(async () => {
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

    client.renderer.propagateEvent(new MouseEvent('click'))
})