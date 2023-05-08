# RpgClientEngine

## RpgEngineHooks

```ts
import { RpgClientEngine, RpgClientEngineHooks } from '@rpgjs/client'

const engine: RpgClientEngineHooks = {
    onConnected(engine: RpgClientEngine) {
        console.log('client is connected')
    }
}
```

<!--@include: ../api/RpgEngineHooks.md-->

## RpgClientEngine

<!--@include: ../api/RpgClientEngine.md-->