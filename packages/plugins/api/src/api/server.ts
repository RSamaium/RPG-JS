import { RpgModule, RpgPlayer, RpgServer, RpgServerEngine, RpgWorld } from "@rpgjs/server"
import { Interpreter } from "./interpreter"
import express from 'express'

function access(config) {
    return function (req, res, next) {
        const token = req.headers['x-access-token']
        try {
            if (!token) {
                throw 'not token'
            }
            if (token != config.apiSecretKey) {
                throw 'token invalid'
            }
            next()
        }
        catch (err) {
            res.status(403).end()
        }
    }
}

@RpgModule<RpgServer>({ 
    engine: {
        onStart(engine: RpgServerEngine) {
            const app = engine.app
            const { admin } = engine.globalConfig
            app.post('/api/players/:playerId/action', access(admin), express.text(), async (req, res, next) => {
                try {
                    const { playerId } = req.params
                    const player: RpgPlayer | undefined = RpgWorld.getPlayers().find(player => player['mongoId'] ==  playerId)
                    if (player) {
                        const interpreter = new Interpreter(player, req.body)
                        await interpreter.exec()
                        player.syncChanges()
                        res.send('ok')
                        return
                    }
                    res.send('not user') 
                }
                catch(err: any) {
                    res.status(500).json({
                        message: err.message
                    })
                    throw err
                }
            })
        }
    }
})
export default class RpgServerModule {}