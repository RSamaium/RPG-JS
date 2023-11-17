import { RpgServer, RpgModule } from '@rpgjs/server'
import player from './player.js';

/** @ts-ignore */
@RpgModule<RpgServer>({
    hooks: {
        player: ['onEquip'],
    },
    player
})
export default class RpgServerModule { }