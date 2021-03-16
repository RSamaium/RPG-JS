import { RpgServer, RpgServerEngine } from '@rpgjs/server'
import { OverWorldMap } from './maps/overworld';
import { Player } from './player';

@RpgServer({
    basePath: __dirname,
    maps: [
        OverWorldMap
    ],
    playerClass: Player
})
export default class RPG extends RpgServerEngine { } 