# RpgSceneMap

## Example to use (in module)

```ts
import { RpgServer, RpgModule, RpgServerEngine } from '@rpgjs/server'

@RpgModule<RpgServer>({ 
    engine: {
        onStart(engine: RpgServerEngine) {
            const sceneMap = engine.sceneMap
            sceneMap.createDynamicMap({
                id: 'myid',
                file: require('./tmx/town.tmx')
            })
        }
    }
})
export default class RpgServerModuleEngine {}
```

## API

<!--@include: ../api/SceneMap.md-->
