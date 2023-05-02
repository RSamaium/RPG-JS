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

    router.put('/maps', (req, res) => {
        const { mapId, data, mapFile } = req.body
        const maps = rpgServer.sceneMap.getMaps()
        const findMap = maps.find(map => {
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

    router.put('/tilesets', async (req, res) => {
        const { data, tilesetId } = req.body
        const maps = Query.getRooms<RpgMap>()
        for (let [id, map] of maps) {
            const findTileset = map.tilesets.find(tileset => tileset.name === tilesetId)
            if (findTileset) {
                await map.updateTileset(data)
            }
        }
        res.json({ success: true })
    })

    router.put('/worlds', (req, res) => {
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