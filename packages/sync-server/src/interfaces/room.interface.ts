import { User } from '../rooms/default';

export interface OnInit {
    onInit: () => void
}

export interface OnJoin {
    onJoin: (user: any) => void
}

export interface OnLeave {
    onLeave: (user: any) => void
}

export interface RoomClass {
    id?: string
    users: {
        [userId: string]: User
    }
    $schema?: any
    $dict?: any
    $inputs?: {
        [key: string]: string
    }
    $actions?: {
        [key: string]: string
    },
    $detectChanges?: () => void,
    $join?: (user: User) => void
    $leave?: (user: User) => void
    $currentState?: () => Object
    $clearCurrentState?: () => void
}