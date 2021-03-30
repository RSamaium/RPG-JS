import { RpgClient, RpgClientEngine } from '@rpgjs/client'
import { Tilesets } from './tilesets/tileset';
import { HeroCharacter } from './characters/hero';
import { SceneMap } from './map';
import { MonsterCharacter } from './characters/monster';

@RpgClient({
    spritesheets: [
        Tilesets,
        HeroCharacter,
        MonsterCharacter
    ],
    scenes: {
        map: SceneMap
    }
})
export default class RPG extends RpgClientEngine {
}