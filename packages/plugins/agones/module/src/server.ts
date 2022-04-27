import { RpgServer, RpgModule, RpgServerEngine, RpgPlayer, RpgMap, RpgWorld } from '@rpgjs/server'
import AgonesSDK from '@google-cloud/agones-sdk'
import { RedisStore } from './redisStore'
import { IAgones } from './interfaces/agones'

const agonesSDK: IAgones = new AgonesSDK()
const { MATCH_MAKER_URL, MATCH_MAKER_SECRET_TOKEN } = process.env

if (!MATCH_MAKER_URL) {
    console.error('Please set the environment variable MATCH_MAKER_URL')
    process.exit(0)
}

if (!MATCH_MAKER_SECRET_TOKEN) {
    console.error('Please set the environment variable MATCH_MAKER_SECRET_TOKEN')
    process.exit(0)
}

@RpgModule<RpgServer>({ 
    player: {
     async onDisconnected(player: RpgPlayer) {
        const players = RpgWorld.getPlayers()
        console.log(players)
        if (players.length == 1) { // this player
            await agonesSDK.shutdown()
        }
     },
     async onJoinMap(player: RpgPlayer, map: RpgMap) {
        await agonesSDK.allocate()
        await agonesSDK.setLabel('map-' + map.id, '1')
     },
     async onLeaveMap(player: RpgPlayer, map: RpgMap) {
        const players = RpgWorld.getPlayersOfMap(map.id)
        console.log(players)
        if (players.length == 1) { // this player
            await agonesSDK.setLabel('map-' + map.id, '0')
        }
     }
    },
    engine: {
        async onStart(server: RpgServerEngine)  {
            let healthInterval
            try {
                await agonesSDK.connect()
                await agonesSDK.setLabel('server-id', server.serverId)
                await agonesSDK.ready()
                healthInterval = setInterval(() => {
                    agonesSDK.health()
                }, 20000)
            }
            catch (error) {
                console.log('Unable to connect to the Agones cluster')
                console.error(error)
                if (healthInterval) clearInterval(healthInterval)
                process.exit(0)
            }
        }
    },
    scalability: {
        matchMaker: {
            endpoint: MATCH_MAKER_URL + '/get-gameserver',
            headers: {
                'x-access-token': MATCH_MAKER_SECRET_TOKEN
            }
        },
        stateStore: new RedisStore({
            url: process.env.REDIS_URL
        }),
        hooks: {
            async onConnected(redisStore: RedisStore, matchMaker, player: RpgPlayer) {
                const obj = await redisStore.get(player.session as string)
                player.load(obj)
                return true
            },
            async doChangeServer(redisStore: RedisStore, matchMaker, player: RpgPlayer) {
                await redisStore.set(player.session as string, player.save())
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
export default class RpgServerModule {}