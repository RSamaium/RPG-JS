import { RpgServer, RpgModule, RpgPlayer, type RpgServerEngine } from '@rpgjs/server'
import { ThirdwebSDK } from '@thirdweb-dev/sdk'
import AuthModule from '@rpgjs/auth'
import { PlayerWeb3Manager } from './web3manager'

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        web3: PlayerWeb3Manager
    }
    export interface RpgServerEngine {
        web3: ThirdwebSDK
    }
}

// @ts-ignore
@RpgModule<RpgServer>({
    imports: [AuthModule],
    engine: {
        onStart(engine: RpgServerEngine) {
            engine.web3 = new ThirdwebSDK('mumbai');
        }
    },
    player: {
        onConnected(player: RpgPlayer) {
            player.web3 = new PlayerWeb3Manager(player._socket.web3)
            delete player._socket.web3
        }
    }
})
export default class RpgServerWeb3ModuleEngine { }