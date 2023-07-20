import { RpgServer, RpgModule, RpgPlayer } from '@rpgjs/server'

@RpgModule<RpgServer>({ 
    player: {
        onConnected(player: RpgPlayer) {
            const gui = player.gui('rpg-title-screen')
            gui.on('load-game', ({ index }) => {
                const storage = localStorage.getItem('rpgjs-save')
                if (storage) {
                    const slots = JSON.parse(storage)
                    const slot = slots[index]
                    gui.close()
                    player.load(slot)
                    player.canMove = true
                }
            })
            gui.on('start-game', () => {
                gui.close()
                player.changeMap(player.server.globalConfig.start.map)
            })
            gui.open()
        }
    }
})
export default class RpgServerModule {}