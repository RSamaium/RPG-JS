import RpgPlayer from '@rpgjs/server'

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        showTitleScreen: () => void,
        mongoId: string
    }
}