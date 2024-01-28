
import { SiweMessage } from 'siwe'
import { RpgServerEngine, inject } from '@rpgjs/server'
import z from 'zod'
import jwt from 'jsonwebtoken'

interface Message {
    nonce: string
}

interface AuthConfig {
    jwtSecret: string
}

export function playerWeb3VerifyHandler(authConfig: AuthConfig) {
    return async (req, res, next) => {
        try {
            const server = inject(RpgServerEngine)

            const schema = z.object({
                message: z.object({
                    nonce: z.string(),
                }),
                signature: z.string()
            }).strict()

            schema.parse(req.body)

            const { message, signature }: { message: Message, signature: string } = req.body
            const jwtSecret = authConfig.jwtSecret

            let data

            try {
                let SIWEObject = new SiweMessage(message)
                const ret = await SIWEObject.verify({ signature, nonce: message.nonce })
                data = ret.data
            }
            catch (err) {
                throw new Error('Signature verification failed')
            }

            const token = jwt.sign({
                address: data.address,
                chainId: data.chainId,
            }, jwtSecret, {
                expiresIn: '1d',
            })

            let result = {
                exp: (jwt.decode(token) as jwt.JwtPayload).exp,
                token
            }

            const cookie = server.globalConfig.auth?.cookie

            // http only
            res.cookie(cookie?.name || 'rpg-token', token, {
                httpOnly: true,
                maxAge: 1000 * 60 * 60 * 24 * 365,
                secure: false,
                ...(cookie || {})
            }).send(result)

        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).send(error.errors)
                return
            }
            next(error)
        }
    }
}