import express from 'express'
import cors from 'cors'
import { MatchMakerService } from './service'

const load = () => {
    const SECRET_TOKEN = process.env.SECRET_TOKEN

    if (!SECRET_TOKEN) {
        console.error('Please set the environment variable SECRET_TOKEN')
        process.exit(0)
    }

    const app = express()
    const service = new MatchMakerService()

    app.use(cors())
    app.use(express.json())

    const auth = function(req, res, next) {
        const token = req.headers['x-access-token']
        if (!token || token != SECRET_TOKEN) {
            const error = new Error('Forbidden')
            error['status'] = 401
            return next(error)
        }
        next()
    }

    app.get('/health', (req, res) => {
        res.send('ok')
    })

    app.get('/start', async (req, res, next) => {
        try {
            const server = await service.start()
            res.json(server)
        }
        catch (err) {
            next(err)
        }
    })

    app.post('/get-gameserver', auth, async (req, res, next) => {
        try {
            const server = await service.getGameServer(req.body)
            res.json(server)
        }
        catch (err) {
            next(err)
        }
    })

    app.use((err, req, res, next) => {
        res.status(err.status || 500).end()
    })

    return app
}

export default load