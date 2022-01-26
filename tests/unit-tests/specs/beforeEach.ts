import { RpgModule, RpgServer, RpgWorld } from '@rpgjs/server'
import { SampleMap } from './fixtures/maps/map'
import { testing } from '@rpgjs/testing'

@RpgModule<RpgServer>({
    maps: [SampleMap]
})
class RpgServerModule {}

const commonModules = [
    {
        server: RpgServerModule
    }
]

export const _beforeEach: any = async (modules: any = []) => {
    const fixture = testing([
        ...commonModules,
        ...modules
    ], {
        basePath: __dirname
    })
    const clientFixture = await fixture.createClient()
    const client = clientFixture.client
    const playerId = clientFixture.playerId
    let player = RpgWorld.getPlayer(playerId)
    await player.changeMap('map')
    player = RpgWorld.getPlayer(player)
    return {
        fixture,
        server: fixture.server,
        client,
        playerId,
        player
    }
}