import mongoose from 'mongoose'
import { RpgServer, RpgModule, RpgServerEngine, RpgPlayer, RpgWorld } from '@rpgjs/server'
import Player from './model'

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        mongoId: string
    }
}

function mongoLog(msg, ...more) {
    console.log(`RPGJS MongoDB => ${msg}`, ...more)
}

function Error401() {
    const error = new Error()
    error['status'] = 401
    return error
}

async function login(body) {
    const { nickname, password } = body
    const player = await Player.findOne({
        nickname
    }) as any
    if (!player) {
        throw Error401()
    }
    const valid = await player.verifyPassword(password)
    if (!valid) {
        throw Error401()
    }
    return {
        nickname: player.nickname,
        _id: player._id,
        data: player.data
    }
}
const originalSaveMethod = RpgPlayer.prototype.save
RpgPlayer.prototype.save = function(): string {
    const json = originalSaveMethod.apply(this)
    Player.findByIdAndUpdate(this.mongoId, { data: json }).catch(err => {
        console.log(err)
    })
    return json
}

@RpgModule<RpgServer>({ 
    engine: {
        onStart(engine: RpgServerEngine) {
            const app = engine.app
            const { mongodb } = engine.globalConfig.titleScreen || engine.globalConfig
            if (!mongodb) {
                mongoLog('Please note that you have not specified the link to mongodb. The connection, uploading and saving will not work')
            }
            else {
                mongoLog('Waiting for connection to MongoDB...')
                mongoose.connect(mongodb).then(() => {
                    mongoLog('Super, your Game is connected with MongoDB')
                }).catch(err => {
                    mongoLog('A problem occurred when connecting to MongoDB', err)
                })
            }
            app.post('/login', async (req, res, next) => {
                try {
                    const user = await login(req.body)
                    res.json(user)
                }
                catch (err : any) {
                    res.status((err).status || 500).json(err)
                }
            })
            app.post('/user/exists', async (req, res, next) => {
                try {
                    const { nickname } = req.body
                    const player = await Player.findOne({
                        nickname
                    }) as any
                    res.json({
                        exists: !!player
                    })
                }
                catch (err) {
                    res.status(500).json(err)
                }
            })
            app.post('/user/create', async (req, res, next) => {
                try {
                    const { nickname, email, password } = req.body
                    const player = new Player({
                        nickname,
                        email,
                        password
                    })
                    await player.save()
                    res.status(204).send()
                }
                catch (err) {
                    res.status(500).json(err)
                }
            })
        }
    },
    player: {
        props: {
            mongoId: {
                $syncWithClient: false
            }
        },
        onConnected(player: RpgPlayer) {
            const { startMap } = player.server.globalConfig
            const gui = player.gui('rpg-title-screen')
            gui.on('login', async (body) => {
                try {
                    const user = await login(body)
                    const mongoId = user._id.toString()
                    const playerIsAlreadyInGame = !!RpgWorld.getPlayers().find(p => {
                        return p.mongoId == mongoId
                    })
                    if (playerIsAlreadyInGame) {
                        throw new Error('PLAYER_IN_GAME')
                    }
                    player.mongoId = mongoId
                    if (!user.data) {
                        player.name = user.nickname
                        player.changeMap(startMap)
                    }
                    else {
                        player.load(user.data)
                        player.canMove = true
                    }
                    gui.close()
                }
                catch (err: any) {
                    let error = {}
                    if (err.status == 401) {
                        error = {
                            message: 'LOGIN_FAIL'
                        }
                    }
                    else {
                        error = {
                            message: err.message
                        }
                    }
                    player.emit('login-fail', error)
                }
            })
            gui.open()
        }
    }
})
export default class RpgServerModule {}