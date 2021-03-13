import { DefaultRoom, User } from '../rooms/default'
import { TransportCommon } from './common';

export class Transport extends TransportCommon {
    constructor(private io) {
        super()
        io.on('connection', (socket) => {
            const id = socket.client.id
            this.onConnectedCb(socket, id)
            socket.on(':input', ({ prop, value }) => this.onInputCb(id, prop, value))
            socket.on(':action', ({ name, value }) => this.onActionCb(id, name, value))
            socket.on(':join', (roomId) => this.onJoinCb(roomId, id))
            socket.on('disconnect', () => this.onDisconnectedCb(id))
        })
    }
}