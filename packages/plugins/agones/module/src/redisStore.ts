import { createClient, RedisClientType } from 'redis'

export class RedisStore {
    private client: RedisClientType

    constructor(private options: { url: string | undefined }) {}

    async connect() {
        this.client = createClient(this.options)
        console.log(this.client)
        await this.client.connect()
    }

    set(key: string, val: any): Promise<any> {
        return this.client.set(key, val)
    }

    get(key: string): Promise<string | null> {
        return this.client.get(key)
    }
}