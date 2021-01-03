import { RpgServer, RpgServerEngine } from '@rpgjs/server'
import { Potion } from './item'
import { Sword } from './weapons'
import { Confuse } from './state'
import { Fire } from './skill'

@RpgServer({
    basePath: __dirname,
    database: [
        Potion,
        Sword,
        Confuse,
        Fire
    ]
})
export class RPGServer extends RpgServerEngine {
    
}