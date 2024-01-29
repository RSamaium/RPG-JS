import { Components, RpgPlayer } from '@rpgjs/server'

export default {
    onConnected(player: RpgPlayer) {
        player.setComponentsTop(Components.text(player.web3.walletAdress))
    }
}