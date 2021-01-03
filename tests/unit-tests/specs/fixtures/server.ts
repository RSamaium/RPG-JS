import { RpgServer, RpgServerEngine } from '@rpgjs/server'
import { Potion } from './item'
import { Sword } from './weapons'
import { Confuse, HpPlus, Sleep } from './state'
import { Fire } from './skill'

@RpgServer({
    basePath: __dirname,
    database: [
        Potion,
        Sword,
        Confuse,
        HpPlus,
        Sleep,
        Fire
    ]
})
export class RPGServer extends RpgServerEngine {
    
}