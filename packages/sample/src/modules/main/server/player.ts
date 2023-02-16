import { RpgPlayer, RpgMap, RpgPlayerHooks, Direction, Move, RpgShape, ShapePositioning, Control, RpgEvent, EventData, RpgWorld, AbstractObject, Components } from '@rpgjs/server'
import { Armor } from '@rpgjs/database'
import { BarComponentObject, TextComponentObject } from '@rpgjs/types';
import { Paralyse } from './paralyse';

let i = 0

@Armor({
    name: 'Shield',
    description: 'Gives a little defense',
    price: 4000
})
export class Shield { }

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        woold: number
    }
}

function BarComponent(current: string, max: string) {
    return {
        id: 'bar',
        value: {
            current,
            max,
            style: {
                perPercent: {
                    '80': {
                        fillColor: '#0000ff'
                    },
                    '50': {
                        fillColor: '#ff0000'
                    },
                },
                fillColor: '#00ff00',
                borderColor: '#000000',
                borderWidth: 2,
                bgColor: '#ffffff',
                borderRadius: 5
            }
        }
    }
}

export const player: RpgPlayerHooks = {
    props: {
        color: String
    },
    onConnected(player: RpgPlayer) {
        player.setHitbox(20, 16)
        
        player.changeMap('samplemap')
        player.name = 'SamUel'
        player.setComponentsBottom([
            Components.shape({
                type: 'ellipse',
                fill: '#ff0000',
                width: 50,
                height: 50,
                opacity: 'hp'
            })
        ]), 
        player.setGraphic('jedi')
        // player.setComponentsLeft<any>(
        //     [
        //         [Components.text('{hp}')]
        //     ]
        // ) 
        // player.setMoveMode({
        //     collision: true,
        //     clientMode: {
        //         drag: {
        //             area: [0, 0, 5, 5]
        //         }
        //     },
        //     behavior: 'direction'
        // })
    },
    onJoinMap(player: RpgPlayer, map: RpgMap) {
       

        //player.position.z = 2 * 32
    },
    onInput(player: RpgPlayer, { input, moving }) {
        if (input == 'attack') {
            //player.showAnimation('jedi', 'attack', true)
            player.setGraphic(['jedi'])
            const map = player.getCurrentMap()
            /*map?.createMovingHitbox([
                { x: player.position.x + 50, y: player.position.y, width: 10, height: 10 }
            ]).subscribe({
                next(hitbox: AbstractObject): void {
                    console.log(hitbox.otherPlayersCollision)

                }
            })*/
            player.addState(Paralyse)
            player.hp -= 100
            //player.setComponentsLeft([])
        }
        if (input == 'action') {
            player.hp += 100
        }
    },
    async onInShape(player: RpgPlayer, shape: RpgShape) {
        console.log('in', player.name, shape.name)
        // await player.changeMap('samplemap')
    },
    onOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log('out', player.name, shape.name)
    }
} 