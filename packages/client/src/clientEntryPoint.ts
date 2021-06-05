import { RpgCommonGame, RpgPlugin, HookClient, loadModules } from '@rpgjs/common'
import { RpgClientEngine } from './RpgClientEngine'

export default (modules, options: any = {}) => {

    const relations = {
        onInit: HookClient.AddSprite,
        onDestroy: HookClient.RemoveSprite,
        onUpdate: HookClient.UpdateSprite,
        onChanges: HookClient.ChangesSprite
    }

    const relationsMap = {
        onAddSprite: HookClient.SceneAddSprite,
        onRemoveSprite: HookClient.SceneRemoveSprite,
        onBeforeLoading: HookClient.BeforeSceneLoading,
        onAfterLoading: HookClient.AfterSceneLoading,
        onMapLoading: HookClient.SceneMapLoading,
        onChanges: HookClient.SceneOnChanges,
        onDraw: HookClient.SceneDraw
    }

    loadModules(modules, {
        side: 'client',
        relations: {
            player: relations,
            sceneMap: relationsMap
        }
    })

    const gameEngine = new RpgCommonGame()
    const clientEngine = new RpgClientEngine(gameEngine, options)
    return clientEngine
}