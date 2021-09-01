import { RpgServer, RpgModule, RpgServerEngine } from '@rpgjs/server'

@RpgModule<RpgServer>({ 
    engine: {
        onStart(engine: RpgServerEngine) {
            const app = engine.app
            app.post('/login', (req, res, next) => {
                // TODO
            })
        }
    }
})
export default class RpgServerModule {}