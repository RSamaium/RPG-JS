import { RpgServer, RpgModule, RpgPlayer } from '@rpgjs/server'
import { CaveMap, SampleMap } from './cave'
import { player, Shield } from './player'
import { RedisStore } from '@rpgjs/agones/src/redisStore'

import WorldMap from './tmx/world.world'

let last
@RpgModule<RpgServer>({ 
    player,
    database: {
        Shield
    },
    engine: {
        onStep() {
            if (last) {
                const time = Date.now() - last
                //process.stdout.write(time + 'ms\r');
            }
            last = Date.now()
        }
    },
    // maps: [
    //     CaveMap,
    //     SampleMap
    // ],
    worldMaps: [ 
        WorldMap
    ],
    scalability: {
        matchMaker: {
            callback(player: RpgPlayer) {
                if ( player.map == 'cave') {
                    return {
                        url: 'http://localhost',
                        port: 3000,
                        serverId: 'test2'
                    }
                }
                return {
                    url: 'http://localhost',
                    port: 3001,
                    serverId: 'test'
                }
            }
        },
        stateStore: new RedisStore(),
        hooks: {
            async onConnected(redisStore, matchMaker, player) {
                const obj = await redisStore.get(player.session)
                console.log(obj)
                player.load(obj)
                return true
            },
            async doChangeServer(redisStore, matchMaker, player) {
                await redisStore.set(player.session, player.save())
                const server = await matchMaker.getServer(player)
                if (server) {
                    player.changeServer(server.url, server.port)
                    return true
                } 
                return false
            }
        }
    }
})
export default class RpgServerEngine {}