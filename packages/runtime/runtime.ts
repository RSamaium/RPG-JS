import entryPoint from 'rpg!virtual-standalone.ts'
import * as Client from '@rpgjs/client'
import * as Server from '@rpgjs/server'
import * as Database from '@rpgjs/database'
import * as Standalone from '@rpgjs/standalone'

export default {
    run: (modules) => {
        return entryPoint(modules).start()
    },
    Client,
    Server,
    Database,
    Standalone
}