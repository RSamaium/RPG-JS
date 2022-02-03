import { RpgMap, RpgModule, RpgServer, RpgWorld } from '@rpgjs/server'
import { RpgPlugin, HookClient } from '@rpgjs/client'
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

export const _beforeEach: any = async (modules: any = [], serverOptions: any = {}, clientOptions: any = {}) => {
    const fixture = testing([
        ...commonModules,
        ...modules
    ], {
        basePath: __dirname,
        ...serverOptions
    }, clientOptions)
    const clientFixture = await fixture.createClient()
    const client = clientFixture.client
    const playerId = clientFixture.playerId
    let player = RpgWorld.getPlayer(playerId)
    const clientMapLoading = new Promise((resolve: any) => {
        RpgPlugin.on(HookClient.AfterSceneLoading, () => {
            resolve()
        })
    })
    await player.changeMap('map')
    player = RpgWorld.getPlayer(player)
    await clientMapLoading
    return {
        fixture,
        server: fixture.server,
        client,
        playerId,
        player
    }
}