import { User } from '../../src/user';

export class Player extends User {
    static schema = {
        id: String,
        name: String
    }
    name: string = ''
}