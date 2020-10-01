import { random } from './Utils';
import Player from './Player'

export default class Event extends Player {
    static get netScheme() {
        return super.netScheme
    }

    moveRandom() {
        let moveDirNb = 0
        let dir = ''
        const rand = () => {
            const directions = ['left', 'right', 'up', 'down']
            if (moveDirNb == 0) dir = directions[random(0, 3)]
            const canMove = this.move(dir)
            if (moveDirNb >= (150 / this.speed) || !canMove) {
                moveDirNb = 0
            }
            else {
                moveDirNb++
            }
        }
        setInterval(rand, 20)
    }

    syncTo(other) {
        super.syncTo(other)
    }
}
