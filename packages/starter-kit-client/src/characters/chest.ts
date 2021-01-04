import { Spritesheet } from '@rpgjs/client'

@Spritesheet({
    id: 'chest',
    image: require('./assets/chest.png'),
    width: 124,
    height: 61,
    framesHeight: 2,
    framesWidth: 4,
    animations: {
        standUp: [
            [{time: 0, frameX: 3, frameY: 0 }]
        ],
        standDown: [
            [{time: 0, frameX: 3, frameY: 1 }]
        ]
    }
})
export class Chest { }