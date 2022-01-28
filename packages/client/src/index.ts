import { Direction, Control, Input, PrebuiltGui, HookServer, HookClient, RpgPlugin, RpgModule, RpgCommonPlayer as RpgSpriteLogic } from '@rpgjs/common'
import entryPoint from './clientEntryPoint'
import { RpgClient, RpgSceneHooks, RpgSceneMapHooks, RpgSpriteHooks, RpgClientEngineHooks } from './RpgClient'
import { Scene as RpgScene } from './Scene/Scene'
import { RpgClientEngine } from './RpgClientEngine'
import { RpgSprite } from './Sprite/Player'
import { Spritesheet } from './Sprite/Spritesheet'
import { Sound } from './Sound/Sound'
import { Howler as RpgGlobalSound }  from 'howler'
import { RpgSound } from './Sound/RpgSound'
import * as Presets from './Presets/AnimationSpritesheet'
import { Animation } from './Effects/AnimationCharacter'
import { ISpriteCharacter } from './Interfaces/Character'
import { SceneData } from './Scene/SceneData'
import { SceneMap as RpgSceneMap } from './Scene/Map'
import { RpgGui } from './RpgGui';
import { Timeline, Ease } from './Effects/Timeline';
import { spritesheets } from './Sprite/Spritesheets'
import { sounds } from './Sound/Sounds'

const RpgResource = {
    spritesheets,
    sounds
}

export {
    RpgClient,
    entryPoint,
    Spritesheet,
    RpgSprite,
    Sound,
    RpgGlobalSound,
    RpgSound,
    Presets,
    Animation,
    Timeline,
    Ease,
    Direction,
    ISpriteCharacter,
    SceneData,
    RpgSceneMap,
    RpgGui,
    Control, 
    Input,
    PrebuiltGui,
    HookServer,
    HookClient,
    RpgModule,
    RpgSceneHooks,
    RpgSceneMapHooks,
    RpgSpriteHooks,
    RpgClientEngineHooks,
    RpgResource,
    RpgClientEngine,
    RpgPlugin,
    RpgScene,
    RpgSpriteLogic
}