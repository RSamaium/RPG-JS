import { Router } from 'express'
import { RpgServerEngine } from '../server'
import { Query } from '../Query'
import { RpgMap } from '../Game/Map'
import { NotAuthorized } from './errors/NotAuthorized'
import { NotFound } from './errors/NotFound'

type ApiConfig = {
    enabled?: boolean,
    authSecret?: string,
}

export function api(rpgServer: RpgServerEngine): Router {
    const router = new Router()

    router.use((req, res, next) => {
        try {
            const apiConfig: ApiConfig = rpgServer.globalConfig.api || {}
            const enabled = apiConfig.enabled === undefined ? false : apiConfig.enabled
            const { dev } = req.query
            if (process.env.NODE_ENV === 'development' && dev) {
                return next()
            }
            if (!enabled) {
                throw new NotAuthorized('API disabled')
            }
            const authSecret = apiConfig.authSecret
            if (!authSecret) {
                throw new NotAuthorized('API secret not defined')
            }
            // headers
            const authHeader = req.headers.authorization
            if (!authHeader) {
                throw new NotAuthorized('Authorization header not defined')
            }
            const [type, token] = authHeader.split(' ')
            if (type !== 'Bearer') {
                throw new NotAuthorized('Authorization type not supported')
            }
            if (token !== authSecret) {
                throw new NotAuthorized('Authorization token not valid')
            }
            next()
        }
        catch (err) {
            next(err)
        }
    })

    router.get('/players', (req, res) => {
        const players = Query.getPlayers()
        res.json(players)
    })

    router.put('/maps', (req, res, next) => {
        try {
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
                throw new NotFound('Map not found')
            }
        }
        catch (err) {
            next(err)
        }
    })

    router.put('/tilesets', async (req, res, next) => {
        try {
            const { data, tilesetId } = req.body
            const maps = Query.getRooms<RpgMap>()
            for (let [id, map] of maps) {
                const findTileset = map.tilesets.find(tileset => tileset.name === tilesetId)
                if (findTileset) {
                    await map.updateTileset(data)
                }
            }
            res.json({ success: true })
        }
        catch (err) {
            next(err)
        }
    })

    router.put('/worlds', (req, res, next) => {
        try {
            const { worldId, data } = req.body
            const sceneMap = rpgServer.sceneMap
            const world = sceneMap.getWorldMaps(worldId)
            if (world) {
                sceneMap.deleteWorldMaps(worldId)
                sceneMap.createDynamicWorldMaps(data)
                res.json({ success: true })
            }
            else {
                throw new NotFound('World not found')
            }
        }
        catch (err) {
            next(err)
        }
    })

    return router
}