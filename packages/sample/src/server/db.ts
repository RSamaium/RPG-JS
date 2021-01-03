import PouchDB from 'pouchdb'

export class Db extends PouchDB {
    constructor(database) {
        super(database)
    }

    save(player) {
        const json = player.save()
        return this.put({
            _id: 'test',
            _rev: player._rev,
            data: json
        })
    }

    async load(player) {
        const { data } = await this.get('test')
        player.load(data)
    }
}

export interface Db {
    put: any
    get: any
}