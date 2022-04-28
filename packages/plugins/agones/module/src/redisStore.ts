import { createClient, RedisClientType } from 'redis'
import { IStoreState } from '@rpgjs/server'

export class RedisStore implements IStoreState {
    private client: RedisClientType

    constructor(private options: { url: string | undefined }) {}

    async connect() {
        this.client = createClient(this.options)
        await this.client.connect()
    }

    set(key: string, val: any): Promise<any> {
        return this.client.set(key, val)
    }

    get(key: string): Promise<string | null> {
        return this.client.get(key)
    }
}