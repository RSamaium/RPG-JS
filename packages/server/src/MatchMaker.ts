
import axios from 'axios'
import { Utils } from '@rpgjs/common'
import { RpgPlayer } from './Player/Player'
import { inject } from './inject'
import { RpgServerEngine } from './server'

interface MatchMakerPayload {
    playerId: string
    mapName: string
}

export interface MatchMakerResponse {
    url: string
    port: number
    serverId: string
}

export interface MatchMakerOption {
    endpoint?: string
    headers?: any
    callback?: (payload: MatchMakerPayload) => MatchMakerResponse
}

export class RpgMatchMaker {
    private endpoint?: string
    private headers?: any
    private callback?: (payload: MatchMakerPayload) => MatchMakerResponse

    constructor(private options: MatchMakerOption) {
        this.endpoint = options.endpoint
        this.headers = options.headers
        this.callback = options.callback
    }

    async getServer(player: RpgPlayer): Promise<MatchMakerResponse | null> {
        const currentServerId = inject(RpgServerEngine).serverId
        const payload: MatchMakerPayload = {
            playerId: player.id,
            mapName: player.map
        }
        let res = {} as MatchMakerResponse
        if (this.callback) {
            res = this.callback(payload)
            if (Utils.isPromise(res)) {
                res = await res
            }
        }
        if (this.endpoint) {
            try {
                res = await axios.post<MatchMakerResponse>(this.endpoint, payload, {
                    headers: this.headers
                }).then(res => res.data)
            }
            catch (err) {
                console.log('There is a problem with the MatchMaker webservice.')        
                throw err
            }
        }
        if (currentServerId == res.serverId) {
            return null
        }
        return res
    }
}