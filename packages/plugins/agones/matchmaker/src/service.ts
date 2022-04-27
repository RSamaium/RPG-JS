import { AgonesApi } from './agones-api'

export enum State {
    Ready = 'Ready',
    Allocated = 'Allocated',
    Shutdown = 'Shutdown',
    RequestReady = 'RequestReady',
    PortAllocation = 'PortAllocation'
}

export interface Response {
    url: string
    port: number
    serverId: string
}

export interface MatchMakerResponse extends Response {
    state: State
    serverName: string,
    maps: string[]
}

export interface MetaData {
    labels?: {
        [key: string]: string
    },
    name: string
}

export interface Server { 
    metadata: MetaData, 
    status: {
        address: string
        state: State
        ports: {
            port: number
        }[]
    } 
}

class NotFoundGameServer extends Error {
    readonly status: number = 404
    constructor() {
        super('Not found Game Server')
    }
}

export class MatchMakerService {
    api: AgonesApi

    constructor() {
        this.api = new AgonesApi()
    }

    static random(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    static getLabel(label: string) {
        return 'agones.dev/sdk-' + label
    }

    private getAllMaps(labels: {
        [key: string]: string
    }): string[] {
        const maps: string[] = []
        for (let label in labels) {
            const value = labels[label]
            const mapName = label.match(/sdk-map-(.+)$/)
            if (mapName && +value) {
                maps.push(mapName[1])
            }
        }
        return maps
    }

    async start(): Promise<Response> {
        const [server] = await this.api.getGameServers().then(this.mapEssentialData.bind(this))
        if (!server) {
            throw new NotFoundGameServer()
        }
        return {
            url: server.url,
            port: server.port,
            serverId: server.serverId
        }
    }

    async getGameServer(params: { playerId: string, mapName: string }): Promise<Response> {
        const { mapName } = params
        let servers = await this.api.getGameServers().then(this.mapEssentialData.bind(this))
        if (servers.length == 0) {
            throw new NotFoundGameServer()
        }
        servers = servers.sort((a, b) => a.maps.length - b.maps.length)
        const serversFind = servers.filter((server: MatchMakerResponse) => {
            return server.maps.find(name => name == mapName)
        })
        if (serversFind.length == 0) {
            return servers[0]
        }
        else {
            return serversFind[0]
        }
    }

    private mapEssentialData(array: any[]): MatchMakerResponse[] {
        return array.map(({ metadata, status }: Server) => {
            let serverId = metadata.labels?.[MatchMakerService.getLabel('server-id')]
            if (!serverId) {
                serverId = ''
            }
            return {
                url: status.address,
                port: status.ports[0].port,
                serverId,
                state: status.state,
                serverName: metadata.name,
                maps: metadata.labels ? this.getAllMaps(metadata.labels) : []
            }
        }).filter((server) => server.state == State.Ready || server.state == State.Allocated)
    }
}