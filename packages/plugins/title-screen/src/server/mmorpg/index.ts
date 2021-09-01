import mongoose from 'mongoose'
import { RpgServer, RpgModule, RpgServerEngine, RpgPlayer } from '@rpgjs/server'
import Player from './model'

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

@RpgModule<RpgServer>({ 
    engine: {
        onStart(engine: RpgServerEngine) {
            const app = engine.app
            const { mongodb } = engine.globalConfig
            if (!mongodb) {
                mongoLog('Please note that you have not specified the link to mongodb. The connection, uploading and saving will not work')
            }
            else {
                mongoLog('Waiting for connection to MongoDB...')
                mongoose.connect(mongodb).then(() => {
                    mongoLog('Super, Tour Game is connected with MongoDB')
                }).catch(err => {
                    mongoLog('A problem occurred when connecting to MongoDB', err)
                })
            }
            app.post('/login', async (req, res, next) => {
                try {
                    const user = await login(req.body)
                    res.json(user)
                }
                catch (err) {
                    res.status(err.status || 500).json(err)
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
        onConnected(player: RpgPlayer) {
            const gui = player.gui('rpg-title-screen')
            gui.on('login', async (body) => {
                const user = await login(body)
                if (!user.data) {
                    player.name = user.nickname
                    player.changeMap('medieval')
                }
                else {
                    player.load(user.data)
                    player.canMove = true
                }
                gui.close()
            })
            gui.open()
        }
    }
})
export default class RpgServerModule {}