import { RpgServer, RpgModule } from '@rpgjs/server'
import { CaveMap } from './cave'
import { player } from './player'

let last
@RpgModule<RpgServer>({ 
    player,
    engine: {
        onStep() {
            if (last) {
                const time = Date.now() - last
                process.stdout.write(time + 'ms\r');
            }
            last = Date.now()
        }
    },
    maps: [
        CaveMap
    ]
})
export default class RpgServerEngine {}