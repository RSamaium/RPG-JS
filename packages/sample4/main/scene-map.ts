import { RpgSceneMapHooks, RpgSceneMap } from '@rpgjs/client'

const sceneMap: RpgSceneMapHooks = {
    onAfterLoading(scene: RpgSceneMap) {
        scene.viewport?.setZoom(1.4);

        scene.on('click', (e) => {
            console.log('click', e);
            scene.game.clientEngine.socket.emit('shoot-bullet', e);
        });
    }
}

export default sceneMap;
