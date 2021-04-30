import { RpgClient, RpgClientEngine } from '@rpgjs/client'
import { Tilesets } from './tilesets/tileset';
import { HeroCharacter } from './characters/hero';
import { SceneMap } from './map';
import { MonsterCharacter } from './characters/monster';
import plugins from '../plugins'

@RpgClient({
    plugins,
    spritesheets: [
        Tilesets,
        HeroCharacter,
        MonsterCharacter
    ],
    scenes: {
        map: SceneMap
    },
    canvas: {
        resolution: 1,
        autoDensity: true
    }
})
export default class RPG extends RpgClientEngine {
}