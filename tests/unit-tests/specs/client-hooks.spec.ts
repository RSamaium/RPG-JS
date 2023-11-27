import {_beforeEach} from './beforeEach'
import { RpgModule } from '@rpgjs/server'
import { RpgClient, RpgClientEngine } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'
import {  test, afterEach, expect } from 'vitest'

test('Test onConnected Hook', () => {
    return new Promise(async (resolve: any) => {
        @RpgModule<RpgClient>({
            engine: {
                onConnected(engine: RpgClientEngine, socket: any) {
                    expect(socket).toBeDefined()
                    expect(engine).toBeDefined()
                    resolve()
                }
            }
        })
        class RpgClientModule {}

        await _beforeEach([{
            client: RpgClientModule
        }], {
            changeMap: false
        })
    })
})

afterEach(() => {
    clear()
})