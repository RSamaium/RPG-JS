import { RpgSceneMapHooks, RpgSceneMap, RpgGui } from '@rpgjs/client';

export const sceneMap: RpgSceneMapHooks = {
    onAfterLoading(map: any) {
        RpgGui.display('rpg-chat')
    }
}