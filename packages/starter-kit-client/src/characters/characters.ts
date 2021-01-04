import { Spritesheet } from '@rpgjs/client'

@Spritesheet({
    images: {
        female13: require('./assets/Female 13-2.png'),
        female19: require('./assets/Female 19-3.png'),
        male1_1: require('./assets/Male 01-1.png'),
        male4_1: require('./assets/Male 04-1.png'),
        male12: require('./assets/Male 12-2.png'),
        male17: require('./assets/Male 17-2.png'),
        male1_2: require('./assets/Male 01-2.png')
    },
    framesWidth: 3,
    framesHeight: 4,
    width: 96,
    height: 128,
    animations: {
        standDown: [
            [{ time: 0, frameX: 1, frameY: 0 }]
        ],
        standUp: [
            [{ time: 0, frameX: 1, frameY: 3 }]
        ],
        standRight: [
            [{ time: 0, frameX: 1, frameY: 2 }]
        ],
        standLeft: [
            [{ time: 0, frameX: 1, frameY: 1 }]
        ],
        walkDown: [
            [
                { time: 0,  frameX: 0, frameY: 0 },
                { time: 5,  frameX: 1, frameY: 0 },
                { time: 10, frameX: 2, frameY: 0 }
            ]
        ],
        walkRight: [
            [
                { time: 0,  frameX: 0, frameY: 2 },
                { time: 5,  frameX: 1, frameY: 2 },
                { time: 10, frameX: 2, frameY: 2 }
            ]
        ],
        walkLeft: [
            [
                { time: 0,  frameX: 0, frameY: 1 },
                { time: 5,  frameX: 1, frameY: 1 },
                { time: 10, frameX: 2, frameY: 1 }
            ]
        ],
        walkUp: [
            [
                { time: 0,  frameX: 0, frameY: 3 },
                { time: 5,  frameX: 1, frameY: 3 },
                { time: 10, frameX: 2, frameY: 3 }
            ]
        ]
    }
})
export class Characters { }