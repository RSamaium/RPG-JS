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
        wood: number
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
        wood: Number
    },
    onConnected(player: RpgPlayer) {
        player.setHitbox(20, 16)
        
        player.setGraphic('male1_1')
        player.name = 'Sam'

        player.addParameter('maxWood', {
            start: 100,
            end: 500
        })

        player.wood = player.param.maxWood

        player.setComponentsTop<any>(
            Components.hpBar({}, '{$percent}%'), 
            {
                width: 42
            }
        )
       
        player.changeMap('cave')

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
    async onInput(player: RpgPlayer, { input, moving }) {
        if (input == 'attack') {
            //player.showAnimation('jedi', 'attack', true)
            player.setGraphic(['jedi'])
            
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
            player.callMainMenu()
        }
    }, 
    async onInShape(player: RpgPlayer, shape: RpgShape) {
        console.log('in', player.name, shape.name)
    },
    onOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log('out', player.name, shape.name)
    }
} 