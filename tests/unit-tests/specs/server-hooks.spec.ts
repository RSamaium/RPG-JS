import {_beforeEach} from './beforeEach'
import { RpgMap, RpgModule, RpgPlayer, RpgServer, RpgServerEngine } from '@rpgjs/server'
import { clear, testing } from '@rpgjs/testing'
import { test, afterEach, expect, vi, describe } from 'vitest'

test('Test onStart Hook', async () => {
    const onStart = vi.fn()

    @RpgModule<RpgServer>({
        engine: {
            onStart
        }
    })
    class RpgServerModule {}

    await _beforeEach([{
        server: RpgServerModule
    }])

    expect(onStart).toHaveBeenCalled()
    expect(onStart).toHaveBeenCalledWith(expect.any(RpgServerEngine))
})

test('Test onStep Hook', async () => {
    const onStep = vi.fn()

    @RpgModule<RpgServer>({
        engine: {
            onStep
        }
    })
    class RpgServerModule {}

    await _beforeEach([{
        server: RpgServerModule
    }])

    expect(onStep).toHaveBeenCalled()
    expect(onStep).toHaveBeenCalledWith(expect.any(RpgServerEngine))
})

describe('Test auth Hook', () => {

    async function createAuthTest(auth) {
        
        @RpgModule<RpgServer>({
            engine: {
                auth
            }
        })
        class RpgServerModule {}
    
        const { player } = await _beforeEach([{
            server: RpgServerModule
        }])
    
        expect(auth).toHaveBeenCalled()
        expect(auth).toHaveBeenCalledWith(expect.any(RpgServerEngine), expect.anything())
        expect(auth).toHaveReturnedWith('test')
        expect(player.id).toBe('test')
    }

    test('Test auth Hook', async () => {
        const auth = vi.fn().mockReturnValue('test')
        await createAuthTest(auth)
    })
    
    test('Test auth Hook with Promise', async () => {
        const auth = vi.fn().mockResolvedValue('test')
        await createAuthTest(auth)
    })
})

afterEach(() => {
    clear()
})