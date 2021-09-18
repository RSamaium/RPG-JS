import { RpgPlayer, RpgMap, RpgPlayerHooks, Direction, Move, RpgShape } from '@rpgjs/server'

export const player: RpgPlayerHooks = {
    onJoinMap(player: RpgPlayer, map: RpgMap) {
       setTimeout(() => {
        const shape = map.createShape({
            ellipse: false,
            gid: 1,
            height: 100,
            polygon: null,
            polyline: null,
            properties: {
                collision: true
            },
            rotation: 0,
            visible: true,
            width: 100,
            x: 500,
            y: 500
           })
           setInterval(() => {
            shape.x += 50
           }, 2000)
       }, 3000)
    },
    onInput(player: RpgPlayer, { input }) {
        if (input == 'back') {
            player.callMainMenu()
        }
    },
    onInShape(player: RpgPlayer, shape: RpgShape) {
        console.log('in', shape)
    },
    onOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log('out', shape)
    }
}