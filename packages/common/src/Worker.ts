export class GameWorker {
    workers: any

    constructor(private workerClass: any) {}
    
    load() {
        this.workers = new this.workerClass(__dirname + '/workers/move.js')
        return this
    } 

    call(methodName: string, data: any) {
        this.workers.postMessage({ method: methodName, data })
    }

    on(cb) {
        this.workers.on('message', cb)
    }
}