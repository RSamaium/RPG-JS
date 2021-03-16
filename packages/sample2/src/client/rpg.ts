import { RpgClient, RpgClientEngine } from '@rpgjs/client'
import { Tilesets } from './tilesets/tileset';
import { HeroCharacter } from './characters/hero';
import { SceneMap } from './map';

@RpgClient({
    spritesheets: [
        Tilesets,
        HeroCharacter
    ],
    scenes: {
        map: SceneMap
    }
})
export default class RPG extends RpgClientEngine {
}