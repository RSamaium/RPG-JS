import { RpgServer, RpgServerEngine } from '@rpgjs/server'
import { OverWorldMap } from './maps/overworld';
import { Player } from './player'
import plugins from '../plugins'

@RpgServer({
    basePath: __dirname,
    plugins,
    maps: [
        OverWorldMap
    ],
    playerClass: Player
})
export default class RPG extends RpgServerEngine { } 