import { RpgWorld } from '@rpgjs/server'
import { testing } from '@rpgjs/testing'

export default async (modules: any = []) => {
    const fixture = testing(modules, {
        basePath: __dirname
    })
    const clientFixture = await fixture.createClient()
    const client = clientFixture.client
    const playerId = clientFixture.playerId
    const player = RpgWorld.getPlayer(playerId)
    return {
        fixture,
        client,
        playerId,
        player
    }
}