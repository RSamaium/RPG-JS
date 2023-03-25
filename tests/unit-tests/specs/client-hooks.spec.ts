import {_beforeEach} from './beforeEach'
import { RpgModule, RpgPlayer } from '@rpgjs/server'
import { RpgClient, RpgClientEngine } from '@rpgjs/client'
import { clear } from '@rpgjs/testing'
import { beforeEach, test, afterEach, expect } from 'vitest'

let  client: RpgClientEngine, 
player: RpgPlayer

test('Test onJoinMap Hook', () => {
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
        }])
    })
})

afterEach(() => {
    clear()
})