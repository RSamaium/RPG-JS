
import axios from 'axios'
import { Utils } from '@rpgjs/common'
import { RpgPlayer } from './Player/Player'

export interface MatchMakerResponse {
    url: string
    port: number
    serverId: string
}

export interface MatchMakerOption {
    endpoint?: string
    headers?: any
    callback?: (player: RpgPlayer) => MatchMakerResponse
}

export class RpgMatchMaker {
    private endpoint?: string
    private headers?: any
    private callback?: (player: RpgPlayer) => MatchMakerResponse

    constructor(private options: MatchMakerOption) {
        this.endpoint = options.endpoint
        this.headers = options.headers
        this.callback = options.callback
    }

    async getServer(player: RpgPlayer): Promise<MatchMakerResponse | null> {
        const currentServerId = player.server.serverId
        let res = {} as MatchMakerResponse
        if (this.callback) {
            res = this.callback(player)
            if (Utils.isPromise(res)) {
                res = await res
            }
        }
        if (this.endpoint) {
            res = await axios.post<MatchMakerResponse>(this.endpoint, {
                playerId: player.id
            }, {
                headers: this.headers
            }).then(res => res.data)
        }
        if (currentServerId == res.serverId) {
            return null
        }
        return res
    }
}