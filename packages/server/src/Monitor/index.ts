import { EventEmitter } from '@rpgjs/common'
import os from 'os'

class Monitor extends EventEmitter {
    private monitors: Map<string, any> = new Map()
    private lastTime: number = 0
    loopMs: number = 0
    totalConnected: number = 0

    get status() {
        return {
            loop: this.loopMs,
            totalConnected: this.totalConnected
        }
    }

    getStatusOf(id) {
        return this.monitors.get(id)
    }

    update(time) {
        this.loopMs = time - this.lastTime
        this.lastTime = time
    }

    addMonitor(socket) {
        let bytesIn = 0 
        let bytesOut = 0
        const update = () => {
            this.monitors.set(id, {
                bytesIn: bytesIn.toFixed(2),
                bytesOut: bytesOut.toFixed(2)
            })
        }
        const id = socket.id
        socket.use((packet, next) => {
            const size = ('42'+JSON.stringify(packet)).length
            bytesIn += size
            update()
            this.emit('update', this.monitors.get(id))
            next()
        })
        socket._emit = socket.emit.bind(socket)
        socket.emit = (name, data) => {
            /*let size = 0
            let obj = data
            if (name == 'worldUpdate') {
                obj = Object.assign({}, data)
                size += Buffer.byteLength(obj.dataBuffer)
                obj.dataBuffer = {_placeholder: true, num: 0}
            }
            size += `451-["${name},${JSON.stringify(obj)}"]`.length
            bytesOut += size*/
            update()
            return socket._emit(name, data) 
        }
        this.totalConnected++
    }

    removeMonitor(id) {
        this.monitors.delete(id)
        this.totalConnected--
    }
}

export default new Monitor()