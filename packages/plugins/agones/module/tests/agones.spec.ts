import { RpgServer, RpgModule } from '@rpgjs/server'
import { RedisStore } from '../src/redisStore'

process.env.MATCH_MAKER_URL = 'test'
process.env.MATCH_MAKER_SECRET_TOKEN = 'test'
process.env.SERVER_ID = 'server1'

import agones from '../src'
import {_beforeEach} from '../../../../../tests/unit-tests/specs/beforeEach'
import { clear } from '@rpgjs/testing'
import { RpgClient, RpgClientEngine } from '@rpgjs/client'

let  client, player, fixture, playerId


jest.mock('@google-cloud/agones-sdk')
jest.mock('../src/redisStore', () => {
    class RedisMockStore {
        private client: Map<string, any>
    
        async connect() {
            this.client = new Map()
        }
    
        async set(key: string, val: any): Promise<any> {
            return this.client.set(key, val)
        }
    
        async get(key: string): Promise<string | null> {
            return this.client.get(key)
        }
    }
    return {
        RedisStore: RedisMockStore
    }
})

const MATCH_MAKER_SERVICE = [
    {
        url: 'fake',
        port: 7000,
        serverId: 'server1'
    }
]

@RpgModule<RpgClient>({ 
    engine: {
        onStart(client: RpgClientEngine)  {
            client.globalConfig.matchMakerService = () => {
                return MATCH_MAKER_SERVICE[0]
            }
        }
    }
})
class RpgClientMockModule {}

agones.server.prototype.scalability.matchMaker = {
    callback() {
        return MATCH_MAKER_SERVICE[0]
    }
}

beforeEach(async () => {
    const ret = await _beforeEach([
        agones,
        {
            client: RpgClientMockModule
        }
    ])
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    playerId = ret.playerId
    
})

test('Test Save', () => {
    expect(1).toBe(1)
})

afterEach(() => {
    clear()
})