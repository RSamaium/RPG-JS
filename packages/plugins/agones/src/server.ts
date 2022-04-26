import { RpgServer, RpgModule, RpgServerEngine, RpgPlayer } from '@rpgjs/server'
import AgonesSDK from '@google-cloud/agones-sdk'
import { RedisStore } from './redisStore'

const agonesSDK = new AgonesSDK()

@RpgModule<RpgServer>({ 
    player: {
     async onConnected(player: RpgPlayer) {
        await agonesSDK.alpha.playerConnect(player.id)
     },
     async onDisconnected(player: RpgPlayer) {
        await agonesSDK.alpha.playerDisconnect(player.id)
     }
    },
    engine: {
        async onStart()  {
            let healthInterval
            try {
                await agonesSDK.connect()
                await agonesSDK.ready()
                healthInterval = setInterval(() => {
                    agonesSDK.health()
                }, 20000)
            }
            catch (error) {
                console.error(error)
                if (healthInterval) clearInterval(healthInterval)
                process.exit(0)
            }
        }
    },
    scalability: {
        matchMakerUri: 'http://localhost',
        stateStore: new RedisStore(),
        hooks: {
            async onConnected(redisStore, player) {
                const obj = await redisStore.get(player.session)
                player.load(obj)
                return true
            },
            async doChangeServer(redisStore, player, matchMaker) {
                const obj = await redisStore.set(player.session, player.save())
                const server = await matchMaker.getServer()
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