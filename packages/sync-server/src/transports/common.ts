import { DefaultRoom, User } from '../rooms/default'

export class TransportCommon {

    protected onConnectedCb
    protected onDisconnectedCb
    protected onJoinCb
    protected onInputCb
    protected onActionCb

    onConnected(cb) {
        this.onConnectedCb = cb
    }

    onJoin(cb) {
        this.onJoinCb = cb
    }

    onInput(cb) {
        this.onInputCb = cb
    }

    onAction(cb) {
        this.onActionCb = cb
    }

    onDisconnected(cb) {
        this.onDisconnectedCb = cb
    }
}