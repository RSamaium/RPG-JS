import msgpack from 'msgpack-lite'
import merge from 'lodash.mergewith'
import { BehaviorSubject } from 'rxjs'

class WorldClass {

    socket: any
    userId: string | null = null
    private obs$: BehaviorSubject<any> = new BehaviorSubject({})

    get value() {
        return this.obs$.asObservable()
    }

    listen(socket, transformData?: Function) {
        this.socket = socket
        this.socket.on('uid', (response) => {
            this.userId = response
        })
        this.socket.on('w', (response) => {
            const bufView = new Uint8Array(response)
            const decode = msgpack.decode(bufView)
            const [roomId, time, data] = decode
            const lastRoomId = this.obs$.value.roomId
            if (lastRoomId != roomId) {
                this.obs$.next({
                    roomId, 
                    data: {},
                    partial: {},
                    time
                }) 
            }
            let mergeData = merge(this.obs$.value.data || {}, data, (objValue, srcValue) => {
                if (typeof srcValue == 'object' && srcValue != null && Object.values(srcValue).length == 0) {
                    return {}
                }
            })
            this.obs$.next({
                roomId, 
                data: mergeData,
                partial: data,
                time
            })
        })
        return this
    }

    reset() {
        this.obs$ = new BehaviorSubject({})
    }
}

export const World = new WorldClass()