export class Client {
    constructor(private io) { }

    playerId: string = ''
    id: string = ''

    connection() {
        this.io.on('playerJoined', (playerData) => {
           this.playerId = this.id = playerData.playerId
        })
        return this.io.connection()
    }
}