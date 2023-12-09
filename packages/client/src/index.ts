export { Direction, Control, Input, PrebuiltGui, HookServer, HookClient, RpgPlugin, RpgModule, RpgCommonPlayer as RpgSpriteLogic } from '@rpgjs/common'
export { default as entryPoint } from './clientEntryPoint'
export type { RpgClient, RpgSceneHooks, RpgSceneMapHooks, RpgSpriteHooks, RpgClientEngineHooks } from './RpgClient'
export { RpgRenderer } from './Renderer'
export { Scene as RpgScene } from './Scene/Scene'
export { RpgClientEngine } from './RpgClientEngine'
export { Spritesheet } from './Sprite/Spritesheet'
export { Sound } from './Sound/Sound'
export { Howler as RpgGlobalSound }  from 'howler'
export { RpgSound } from './Sound/RpgSound'
export * as Presets from './Presets/AnimationSpritesheet'
export { Animation } from './Effects/AnimationCharacter'
export { Animation as AnimationClass } from './Effects/Animation'
export type { ISpriteCharacter } from './Interfaces/Character'
export { SceneData } from './Scene/SceneData'
export { SceneMap as RpgSceneMap } from './Scene/Map'
export { RpgGui } from './Gui/Gui';
export { Timeline, Ease } from './Effects/Timeline';
export { RpgComponent, RpgComponent as RpgSprite } from './Components/Component'
export { KeyboardControls } from './KeyboardControls'
export { World, room } from 'simple-room-client'

import { spritesheets } from './Sprite/Spritesheets'
import { sounds } from './Sound/Sounds'
export const RpgResource = {
    spritesheets,
    sounds
}
export { inject } from './inject'