export interface IAgones {
    connect(): Promise<void>
    ready(): Promise<void>
    health()
    allocate(): Promise<any>
    reserve(time: number): Promise<any>
    shutdown(): Promise<any>
    watchGameServer(cb: (result: { 
        objectMeta: { name: string, labelsMap: string[], annotationsMap: string[] },
        status: { state: string },
        players: {
            count: number,
            capacity: number,
            idsList: string[]
        }
    }) => {})
    setLabel(key: string, value: string): Promise<any>
    setAnnotation(key: string, value: string): Promise<any>
    alpha: {
        setPlayerCapacity(nb: number): Promise<any>
        playerConnect(playerId: string): Promise<any>
        getPlayerCount(): Promise<number>
        isPlayerConnected(playerId: string): Promise<boolean>
        getConnectedPlayers(): Promise<string[]>
        playerDisconnect(playerId: string): Promise<any>
    }
}