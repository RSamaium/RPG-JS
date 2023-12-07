import { RpgClientEngineHooks, RpgClientEngine } from "@rpgjs/client"

const client: RpgClientEngineHooks = {
    onConnectError(engine: RpgClientEngine, err: Error) {
        console.log(err.message)
    }
}

export default client