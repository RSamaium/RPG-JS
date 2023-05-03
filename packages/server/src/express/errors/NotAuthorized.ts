export class NotAuthorized extends Error {
    status = 401
    constructor(message?: string) {
        super(message || 'Not authorized')
    }
}