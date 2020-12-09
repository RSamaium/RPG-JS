export class User {
    static schema = {
        id: String
    }
    id: string
    _socket
    _rooms = []
}