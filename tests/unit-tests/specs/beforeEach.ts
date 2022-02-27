import { RpgMap, RpgModule, RpgServer, RpgWorld } from '@rpgjs/server'
import { RpgPlugin, HookClient, RpgClient } from '@rpgjs/client'
import { SampleMap, Tileset } from './fixtures/maps/map'
import { testing } from '@rpgjs/testing'

@RpgModule<RpgServer>({
    maps: [SampleMap]
})
class RpgServerModule {}

@RpgModule<RpgClient>({
    spritesheets: [Tileset]
})
class RpgClientModule {}

const commonModules = [
    {
        server: RpgServerModule,
        client: RpgClientModule
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
    client.nextFrame(0)
    return {
        fixture,
        server: fixture.server,
        client,
        playerId,
        player
    }
}