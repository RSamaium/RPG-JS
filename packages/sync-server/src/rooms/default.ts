export class User {
    static schema = {
        id: String
    }
    id: string
    _socket
    _rooms: any[] = []
}

export class DefaultRoom  {
   $schema = {
        users: [User.schema]
   }
   users = {}
}