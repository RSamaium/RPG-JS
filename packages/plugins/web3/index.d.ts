import { PlayerWeb3Manager } from './src/server/web3manager'

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        web3: PlayerWeb3Manager
    }
}
