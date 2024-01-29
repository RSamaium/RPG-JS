import { generateNonce } from 'siwe';

export async function playerWeb3NonceHandler(req, res, next) {
    try {
        res.setHeader('Content-Type', 'text/plain')
        res.status(200).send(generateNonce())

    } catch (error) {
        next(error)
    }
}