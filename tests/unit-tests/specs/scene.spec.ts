import {_beforeEach} from './beforeEach'
import { RpgPlayer } from '@rpgjs/server'
import { RpgClientEngine, RpgModule, RpgClient, RpgSceneMap } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect, describe, vi, afterAll } from 'vitest'

let  client: RpgClientEngine, 
player: RpgPlayer

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

// TODO: can't make this test work, because PIXI doesn't propagate the event (only for the test). 
test('Scene Click', async () => {
    const onClick = vi.fn()

    @RpgModule<RpgClient>({
        scenes: {
            map: {
                onAfterLoading(scene) {
                    scene.on('pointerdown', onClick)
                }
            }
        }
    })
    class RpgClientModule { }

    const { client } = await _beforeEach([{
        client: RpgClientModule
    }])

    const guiEl = document.getElementById('rpg')?.children[1].children[0]
    guiEl?.dispatchEvent(new MouseEvent('pointerdown'))
    //expect(onClick).toHaveBeenCalled()
})