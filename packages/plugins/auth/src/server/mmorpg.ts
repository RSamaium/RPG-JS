import { RpgServer, RpgModule, RpgServerEngine, RpgPlayer  } from '@rpgjs/server'
import jwt from 'jsonwebtoken'
import { playerWeb3NonceHandler } from './web3/nonce'
import { playerWeb3VerifyHandler } from './web3/verify'

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        walletAdress: string
    }
}

// @ts-ignore
@RpgModule<RpgServer>({
    engine: {
        auth(engine: RpgServerEngine, socket) {
            const { globalConfig } = engine
            const cookie = socket.request.headers.cookie
            const cookieConfig = engine.globalConfig.auth?.cookie
            const { jwtSecret } = globalConfig.auth
            const token = cookie?.split((cookieConfig?.name || 'rpg-token') + '=')[1]?.split(';')[0]
            if (!token) {
                throw new Error('No token')
            }
            const decoded = jwt.verify(token, jwtSecret)
            if (!decoded) {
                throw new Error('Invalid token')
            }
            socket.web3 = decoded
            return undefined
        },
        onStart(engine: RpgServerEngine) {
            const { globalConfig } = engine
            engine.app.get('/players/web3/nonce', playerWeb3NonceHandler)
            engine.app.post('/players/web3/verify', playerWeb3VerifyHandler(globalConfig.auth))
        },
    }
})
export default class RpgServerAuthModuleEngine { }