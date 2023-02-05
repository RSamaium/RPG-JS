import workerpool from 'workerpool'

export class GameWorker {
    pool: any

    constructor(private options = {}) {
        //this.pool = workerpool.pool(__dirname + '/workers/move.js', options)
    }

    load() {
        return this
    } 

    call(methodName: string, data: any) {
       return this.pool.exec(methodName, [data])
    }
}