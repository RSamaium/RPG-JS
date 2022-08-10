import mongoose from 'mongoose'
import { RpgServer, RpgModule, RpgServerEngine, RpgPlayer, RpgWorld } from '@rpgjs/server'
import Player from './model'
import axios from 'axios'
import { UserAuth } from './interfaces'

export interface AdminConfig {
    url: string,
    secretKey: string,
    publicKey: string
}

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        mongoId: string
    }
}

function mongoLog(msg, ...more) {
    console.log(`RPGJS MongoDB => ${msg}`, ...more)
}

function login(config: AdminConfig, body): Promise<UserAuth> {
    return axios.post(config.url + '/api/players/login', {
        ...body,
        game: {
            value: config.publicKey
        }
    }, {
        headers: {
            'Authorization': 'user API-Key ' + config.secretKey
        }
    }).then(res => res.data)
}

function saveData(config: AdminConfig, mongoId, body): Promise<UserAuth> {
    return axios.put(config.url + '/api/players/' + mongoId, {
        ...body,
        game: {
            value: config.publicKey
        }
    }, {
        headers: {
            'Authorization': 'user API-Key ' + config.secretKey
        }
    }).then(res => res.data)
}


const originalSaveMethod = RpgPlayer.prototype.save
RpgPlayer.prototype.save = function(): string {
    const json = originalSaveMethod.apply(this)
    const { admin } = this.server.globalConfig
    const data = JSON.parse(json)
    saveData(admin, this.mongoId, {
        data: json,
        variables: data.variables.map(([key, value]) => ({ key, value: ''+value })),
        nickname: this.name
    })
    return json
}

@RpgModule<RpgServer>({ 
    engine: {
        onStart(engine: RpgServerEngine) {
            const app = engine.app
            const { admin } = engine.globalConfig
            if (!admin) {
                mongoLog('Add the admin parameter to globalConfig')
                return false
            }
            const { url } = admin
           /* app.post('/login', async (req, res, next) => {
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
            })*/
        }
    },
    player: {
        props: {
            mongoId: {
                $syncWithClient: false
            }
        },
        onConnected(player: RpgPlayer) {
            const { startMap, admin } = player.server.globalConfig
            const gui = player.gui('rpg-title-screen')
            gui.on('login', async (body) => {
                try {
                    const { user, token } = await login(admin, body)
                    const playerIsAlreadyInGame = !!RpgWorld.getPlayers().find(p => !!p.mongoId)
                    if (playerIsAlreadyInGame) {
                        throw new Error('PLAYER_IN_GAME')
                    }
                    player.mongoId = user.id
                    if (!user.data) {
                        if (user.nickname) player.name = user.nickname
                        player.changeMap(startMap)
                    }
                    else {
                        player.load(user.data)
                    }
                    player.canMove = true
                    gui.close(token)
                }
                catch (err: any) {
                    let error = {}
                    if (err.response?.status == 401) {
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