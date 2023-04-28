import { Router } from 'express'
import { RpgServerEngine } from '../server'
import { Query } from '../Query'
import { RpgMap } from '../Game/Map'

export function api(rpgServer: RpgServerEngine): Router {
    const router = new Router()

    router.get('/players', (req, res) => {
        const players = Query.getPlayers()
        res.json(players)
    })

    router.post('/maps/update', (req, res) => {
        const { mapId, data, mapFile } = req.body
        const findMap = rpgServer.sceneMap.getMaps().find(map => {
            if (mapId) {
                return map.id === mapId
            }
            else if (mapFile) {
                return map.file === mapFile
            }
        })
        if (findMap) {
            const map = Query.getRoom<RpgMap>(findMap.id as string)
            map.update(data)
            res.json({ success: true })
        }   
        else {
            res.status(404).json({ error: 'Map not found' })
        }
    })

    router.post('/worlds/update', (req, res) => {
        const { worldId, data } = req.body
        const sceneMap = rpgServer.sceneMap
        const world = sceneMap.getWorldMaps(worldId)
        if (world) {
            sceneMap.deleteWorldMaps(worldId)
            sceneMap.createDynamicWorldMaps(data)
            res.json({ success: true })
        }
        else {
            res.status(404).json({ error: 'World not found' })
        }
    })

    return router
}