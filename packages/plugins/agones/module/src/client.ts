import { RpgClient, RpgClientEngine, RpgModule } from '@rpgjs/client'

@RpgModule<RpgClient>({ 
    engine: {
        onStart(client: RpgClientEngine)  {
            client.globalConfig.matchMakerService = process.env.MATCH_MAKER_URL + '/start'
        }
    }
})
export default class RpgClientModule {}