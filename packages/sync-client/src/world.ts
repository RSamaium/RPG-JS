import msgpack from 'msgpack-lite'
import merge from 'lodash.merge'
import { BehaviorSubject } from 'rxjs'

class WorldClass {

    socket: any
    private obs$: BehaviorSubject<any> = new BehaviorSubject({})

    get value() {
        return this.obs$.asObservable()
    }

    listen(socket) {
        this.socket = socket
        this.socket.on('w', (response) => {
            const bufView = new Uint8Array(response)
            const decode = msgpack.decode(bufView)
            const [roomId, time, data] = decode
            this.obs$.next({
                roomId, 
                data: merge(this.obs$.value.data || {}, data),
                partial: data,
                time
            })
        })
        return this
    }

}

export const World = new WorldClass()