import { RpgClientEngine, Timeline, Ease } from "@rpgjs/client"

export default {
    async onStart(engine: RpgClientEngine) {
       
    },
    onConnectError(engine, err) {
        console.dir(err)
    }
}