export class NotFound extends Error {
    status = 404
    constructor(message?: string) {
        super(message || 'Not found')
    }
}