import { EventEmitter } from '@rpgjs/common'
import os from 'os'

class Monitor extends EventEmitter {
    private monitors: Map<string, any> = new Map()
    private lastTime: any
    loopMs
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

    update(server) {
        const { scheduler, options } = server
        if (this.lastTime) {
            const hrtime = process.hrtime(this.lastTime)
            this.loopMs = hrtime[1] / 1e6
        }
        const period = scheduler.options.period
        if (this.loopMs > period + 20) {
            const { stepRate } = options
            console.warn('%s - Warning Low FPS. %s players connected. Game Loop: %s FPS', new Date(), this.totalConnected, Math.round(stepRate / (this.loopMs / period)))
        }
        this.lastTime = process.hrtime()
    }

    addMonitor(socket) {
        // TODO
        /*
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
            let size = 0
            let obj = data
            if (name == 'worldUpdate') {
                obj = Object.assign({}, data)
                size += Buffer.byteLength(obj.dataBuffer)
                obj.dataBuffer = {_placeholder: true, num: 0}
            }
            size += `451-["${name},${JSON.stringify(obj)}"]`.length
            bytesOut += size
            update()
            return socket._emit(name, data) 
        }
        */
        this.totalConnected++
    }

    removeMonitor(id) {
        this.monitors.delete(id)
        this.totalConnected--
    }
}

export default new Monitor()